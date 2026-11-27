import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  MessageSquare,
  Globe,
  Bot,
  User,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Database,
  AlertCircle,
  Clock,
  Layers,
  Search,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { assistantApi } from '../api/assistantService';
import { MarkdownMessage } from '../components/assistant/MarkdownMessage';

export const AiAssistantPage = () => {
  const queryClient = useQueryClient();
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();
  const siteId = activeWebsite?._id;

  const [activeConversationId, setActiveConversationId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 1. Load Conversations List
  const {
    data: conversations = [],
    isLoading: loadingConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['assistant-conversations', siteId],
    queryFn: async () => {
      return await assistantApi.listConversations({ websiteId: siteId });
    },
    staleTime: 60 * 1000
  });

  // Automatically select the most recent conversation if none is selected
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id || conversations[0]._id);
    }
  }, [conversations, activeConversationId]);

  // 2. Load Active Conversation Details
  const {
    data: activeConversation,
    isLoading: loadingActiveConversation,
    refetch: refetchActiveConversation
  } = useQuery({
    queryKey: ['assistant-conversation', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      return await assistantApi.getConversation(activeConversationId);
    },
    enabled: Boolean(activeConversationId),
    staleTime: 60 * 1000
  });

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isSending]);

  // Suggested Prompts
  const suggestedPrompts = [
    {
      title: 'Website Overview',
      prompt: 'Give me a complete overview of my website profile and current SEO metrics.',
      icon: Globe
    },
    {
      title: 'Lost Backlinks Check',
      prompt: 'Did I lose any backlinks recently? Show me any dropped links and referring domains.',
      icon: AlertCircle
    },
    {
      title: 'Top Prospects to Contact',
      prompt: 'Show me my highest opportunity score prospects with verified email addresses ready for outreach.',
      icon: Search
    },
    {
      title: 'Campaign Performance',
      prompt: 'Which of my link building campaigns is performing best and what should I do next?',
      icon: Layers
    },
    {
      title: 'Outreach & Follow-ups',
      prompt: 'Summarize my cold email outreach queue and show any scheduled follow-ups.',
      icon: Clock
    },
    {
      title: 'SEO Recommendations',
      prompt: 'Analyze my backlink and campaign data and provide actionable SEO recommendations.',
      icon: Sparkles
    }
  ];

  // Handle New Conversation
  const handleNewConversation = async () => {
    try {
      const newConv = await assistantApi.createConversation({
        websiteId: siteId,
        title: 'New Conversation'
      });
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      setActiveConversationId(newConv.id || newConv._id);
      setMobileHistoryOpen(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      addToast(err?.message || 'Failed to create new conversation', 'error');
    }
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread?')) return;
    try {
      await assistantApi.deleteConversation(convId);
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => (c.id || c._id) !== convId);
        setActiveConversationId(remaining[0]?.id || remaining[0]?._id || null);
      }
      addToast('Conversation deleted', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to delete conversation', 'error');
    }
  };

  // Handle Clear Messages
  const handleClearMessages = async () => {
    if (!activeConversationId) return;
    if (!window.confirm('Clear all messages in this conversation?')) return;
    try {
      await assistantApi.clearMessages(activeConversationId);
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversation', activeConversationId] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      addToast('Message history cleared', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to clear messages', 'error');
    }
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend) => {
    const messageContent = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!messageContent || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      let targetConvId = activeConversationId;

      // If no active conversation exists, create one first
      if (!targetConvId) {
        const created = await assistantApi.createConversation({
          websiteId: siteId,
          title: messageContent.slice(0, 40)
        });
        targetConvId = created.id || created._id;
        setActiveConversationId(targetConvId);
      }

      await assistantApi.sendMessage(targetConvId, {
        content: messageContent,
        websiteId: siteId
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assistant-conversation', targetConvId] }),
        queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] })
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
      addToast(err?.message || 'Assistant encountered an error while processing your request', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleToolExpanded = (msgId, toolIdx) => {
    const key = `${msgId}-${toolIdx}`;
    setExpandedTools((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[560px] gap-4 animate-fade-in relative">
      {/* 1. Left Sidebar: Conversation Threads */}
      <div
        className={`fixed top-16 bottom-0 left-0 z-30 w-72 bg-[#101318] sm:bg-[#15191E] border-r sm:border border-white/[0.08] sm:rounded-3xl p-4 flex flex-col transition-transform duration-300 sm:static sm:top-auto sm:bottom-auto sm:z-auto sm:translate-x-0 ${
          mobileHistoryOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-text-primary tracking-wide">AI Conversations</h3>
              <span className="text-[10px] text-text-muted font-mono">{conversations.length} saved threads</span>
            </div>
          </div>
          <button
            onClick={() => setMobileHistoryOpen(false)}
            className="sm:hidden text-text-muted hover:text-text-primary p-1"
          >
            ✕
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewConversation}
          className="my-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs transition-all shadow-glow-brand active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Conversation</span>
        </button>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-10 text-xs text-text-muted">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" />
              <span>Loading threads...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-2 text-xs text-text-muted space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
              <p>No conversations yet.</p>
              <p className="text-[11px] text-slate-400">Click &ldquo;New Conversation&rdquo; to start querying your SEO data.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const convId = conv.id || conv._id;
              const isSelected = activeConversationId === convId;

              return (
                <div
                  key={convId}
                  onClick={() => {
                    setActiveConversationId(convId);
                    setMobileHistoryOpen(false);
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-text-primary font-medium'
                      : 'hover:bg-white/[0.04] border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <div className="truncate">
                      <p className="truncate text-xs">{conv.title || 'Conversation'}</p>
                      <span className="text-[10px] text-text-muted block">
                        {conv.lastActiveAt ? new Date(conv.lastActiveAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(convId, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 rounded transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Active Website Context */}
        {activeWebsite && (
          <div className="pt-3 border-t border-white/[0.08] text-[11px] text-text-muted flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Active: <strong className="text-text-primary font-mono">{activeWebsite.domain}</strong></span>
          </div>
        )}
      </div>

      {/* Mobile backdrop */}
      {mobileHistoryOpen && (
        <div
          onClick={() => setMobileHistoryOpen(false)}
          className="fixed top-16 inset-x-0 bottom-0 z-20 bg-black/60 backdrop-blur-sm sm:hidden"
        />
      )}

      {/* 2. Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-[#15191E] rounded-3xl border border-white/[0.08] overflow-hidden shadow-card">
        {/* Chat Pane Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="sm:hidden p-1.5 rounded-lg bg-white/[0.05] text-text-muted hover:text-text-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-text-primary">LINKORA AI SEO Strategist</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Phase 12
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Powered by OpenAI function calling with live database access
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeWebsite && (
              <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-text-muted font-mono">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>{activeWebsite.domain}</span>
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClearMessages}
                className="p-1.5 text-xs text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                title="Clear message history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {loadingActiveConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p>Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Welcome Empty State & Suggested Prompts */
            <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-brand">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
                  How can I help you grow your SEO authority?
                </h3>
                <p className="text-xs text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">
                  I have secure, read-only access to your backlinks, campaigns, prospects, and monitoring events. Ask me anything about your SEO health.
                </p>
              </div>

              {/* Grid of Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {suggestedPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-3.5 rounded-2xl bg-[#101318]/70 hover:bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/40 hover:shadow-glow-brand transition-all text-xs group space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-text-primary font-semibold">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                          <span>{item.title}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-text-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const hasToolCalls = Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Tool Calls Execution Badge */}
                    {!isUser && hasToolCalls && (
                      <div className="space-y-1.5 mb-2">
                        {msg.toolCalls.map((tc, tcIdx) => {
                          const isExpanded = Boolean(expandedTools[`${msg.id || index}-${tcIdx}`]);

                          return (
                            <div
                              key={tcIdx}
                              className="rounded-xl bg-[#0F1217] border border-white/[0.08] overflow-hidden text-xs"
                            >
                              <button
                                onClick={() => toggleToolExpanded(msg.id || index, tcIdx)}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.02] text-text-muted transition-colors text-[11px]"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Database className="w-3 h-3 text-emerald-400" />
                                  <span>Consulted tool: <strong className="font-mono text-emerald-300">{tc.name}</strong></span>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-3 bg-black/40 border-t border-white/[0.06] text-[11px] font-mono overflow-x-auto max-h-48 text-slate-300 custom-scrollbar">
                                  <div className="mb-1 text-text-muted text-[10px]">OUTPUT:</div>
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(tc.result, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 sm:p-5 rounded-2xl ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-[#101318] border border-white/[0.08] rounded-tl-sm shadow-card'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <MarkdownMessage content={msg.content} />
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-text-muted px-1 block">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-[#101318] border border-white/[0.08] rounded-tl-sm flex items-center gap-3 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>LINKORA AI is analyzing your SEO database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Bottom Chat Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#0E1116] space-y-2">
          <div className="relative flex items-end gap-2 bg-[#15191E] border border-white/[0.1] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 rounded-2xl p-2 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={
                activeWebsite
                  ? `Ask about ${activeWebsite.domain}'s backlinks, campaigns, or prospects...`
                  : 'Ask about backlinks, campaigns, or SEO concepts...'
              }
              className="flex-1 bg-transparent border-0 resize-none px-2 py-1.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none max-h-32 custom-scrollbar"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputText.trim()}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black font-semibold transition-all shadow-glow-brand active:scale-95 shrink-0"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">Shift+Enter</kbd> for new line</span>
            <span className="hidden sm:inline">Read-only live database tool access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
