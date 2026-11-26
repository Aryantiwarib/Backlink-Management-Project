import OpenAI from 'openai';
import { ASSISTANT_TOOL_DEFINITIONS, executeAssistantTool } from './assistantTools.js';

/**
 * Build the system prompt tailored to LINKORA and the active website context
 */
function buildSystemPrompt({ websiteDomain, websiteName }) {
  return `You are the LINKORA AI SEO Assistant — an expert SEO strategist and backlink management consultant.
You assist users in auditing, growing, and monitoring their website backlink profiles and managing outreach campaigns inside LINKORA.

Active Workspace Context:
- Active Website Domain: ${websiteDomain || 'No domain selected yet'}
- Active Website Name: ${websiteName || 'N/A'}

Rules & Operational Guidelines:
1. Always Use Tools for Account & Website Data:
   - When asked about the user's website, backlinks, lost links, monitoring scans, outreach campaigns, prospects, or performance, call the appropriate tool.
   - Do NOT guess or invent backlink counts, domain authority, acquired links, or email addresses.
   - If a tool returns no data or zero records, accurately inform the user (e.g. "You have 0 lost backlinks detected" or "No backlinks are currently saved in MongoDB. Click 'Sync Moz Data' to import them.").
2. Authoritative Data Consistency & Metric Labelling:
   - Always report metrics consistent with the authoritative LINKORA Dashboard.
   - Clearly distinguish between **Moz Global Web Index Metrics** and **Database-Indexed Records**:
     * If Moz web index reports e.g. 5,065 total backlinks and 188 referring domains, report these as the global Moz index totals for the website.
     * If LINKORA has e.g. 50 saved backlink records from 26 unique referring domains, report these as the granular backlink records indexed and tracked in LINKORA for deep analysis.
     * Never state "You have only 50 total backlinks" if the Moz index reports 5,065. Clearly explain the difference: "Moz detects 5,065 external backlinks from 188 referring domains across the global web, and 50 granular backlink records are currently indexed in your LINKORA workspace for detailed analysis."
   - Website Authority vs. Referring Source Authority:
     * Website Moz Domain Authority (DA) and Page Authority (PA) measure the strength of the user's website itself (e.g. Moz DA 10, Moz PA 18, Spam Score 1%).
     * Average Domain Authority (e.g. 32) measures the average DA of referring source websites linking to the user's site. NEVER confuse or report the average referring DA as the website's DA.
   - If live provider data or snapshots have not yet been synchronized, explicitly state that metrics are not yet available rather than inventing values.
3. Provide Clear, Actionable Recommendations:
   - Base SEO advice on concrete evidence from the user's data.
   - When recommending outreach strategies, distinguish between high-authority opportunities (DA ≥ 40) and volume targets.
   - Warn the user if they have lost high-equity backlinks or if their dofollow backlink ratio is unusually low.
4. General SEO Explanations:
   - When users ask general conceptual questions (e.g. "What is Domain Authority?", "How does broken link building work?"), give simple, authoritative, and practical industry explanations.
5. Response Formatting:
   - Use clean Markdown with bolding, bullet points, and tables where helpful.
   - Keep answers professional, concise, and focused on ROI and search rankings.
   - Do not claim you performed write/delete actions (such as sending emails or deleting campaigns) because the assistant operates in read-only analysis mode.`;
}

/**
 * Get or initialize the OpenAI client
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Execute chat completion loop with OpenAI Tool Calling
 *
 * @param {Object} options
 * @param {Array} options.messages - Previous conversation messages [{ role, content }]
 * @param {Object} options.context - { userId, websiteId, websiteDomain, websiteName }
 * @param {Function} [options.mockHandler] - Optional mock handler for tests
 * @returns {Promise<{ content: string, toolCalls: Array, model: string, usage: Object }>}
 */
export async function generateAssistantResponse({ messages, context, mockHandler = null }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Check if mock handler is provided (for offline automated testing)
  if (mockHandler && typeof mockHandler === 'function') {
    return await mockHandler({ messages, context, model });
  }

  const client = getOpenAIClient();
  if (!client) {
    // When no API key is set, return a clear, helpful message directing the user to configure OPENAI_API_KEY
    return {
      content: `⚠️ **OpenAI API Key Not Configured**\n\nThe LINKORA AI SEO Assistant requires an OpenAI API key to process questions and analyze your backlink data.\n\nTo activate the assistant:\n1. Open \`server/.env\` in your project.\n2. Set your API key: \`OPENAI_API_KEY=sk-...\`\n3. Restart the server.\n\nOnce configured, you will be able to ask natural-language questions about your backlinks, campaigns, prospects, and SEO performance.`,
      toolCalls: [],
      model: 'unconfigured',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt({
      websiteDomain: context.websiteDomain,
      websiteName: context.websiteName
    })
  };

  // Prepare initial conversation payload
  const conversationPayload = [
    systemMessage,
    ...messages.map((m) => ({
      role: m.role === 'tool' ? 'tool' : m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
      ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
      ...(m.tool_calls && { tool_calls: m.tool_calls })
    }))
  ];

  const executedToolCalls = [];
  let rounds = 0;
  const MAX_ROUNDS = 5; // Guard against infinite tool loops

  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;

      const completion = await client.chat.completions.create({
        model,
        messages: conversationPayload,
        tools: ASSISTANT_TOOL_DEFINITIONS,
        temperature: 0.3
      });

      const responseMessage = completion.choices[0]?.message;
      if (!responseMessage) {
        throw new Error('OpenAI returned an empty response choice');
      }

      // Check if OpenAI requested one or more tool calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Append assistant's tool-call request message to history
        conversationPayload.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            console.warn(`Failed to parse arguments for tool ${functionName}:`, e.message);
          }

          // Execute tool with authenticated context
          let toolResult;
          try {
            toolResult = await executeAssistantTool({
              name: functionName,
              args: parsedArgs,
              context
            });
          } catch (toolError) {
            console.error(`Error executing tool ${functionName}:`, toolError);
            toolResult = {
              success: false,
              error: toolError.message || 'Tool execution failed'
            };
          }

          executedToolCalls.push({
            id: toolCall.id,
            name: functionName,
            args: parsedArgs,
            result: toolResult
          });

          // Append tool execution result message
          conversationPayload.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }

        // Loop again so OpenAI can synthesize the final answer using tool results
        continue;
      }

      // Final assistant response reached
      return {
        content: responseMessage.content || '',
        toolCalls: executedToolCalls,
        model: completion.model || model,
        usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    }

    throw new Error('Exceeded maximum tool calling iterations');
  } catch (err) {
    console.error('[OpenAIService Error]:', err);
    if (err.status === 429) {
      return {
        content: `⚠️ **OpenAI Rate Limit Exceeded**\n\nThe assistant reached OpenAI's rate or quota limits. Please try again in a few moments or review your OpenAI account usage.`,
        toolCalls: executedToolCalls,
        model,
        usage: null
      };
    }

    if (err.status === 401) {
      return {
        content: `⚠️ **Invalid OpenAI API Key**\n\nThe configured \`OPENAI_API_KEY\` was rejected by OpenAI (401 Unauthorized). Please check your key in \`server/.env\`.`,
        toolCalls: executedToolCalls,
        model,
        usage: null
      };
    }

    throw err;
  }
}
