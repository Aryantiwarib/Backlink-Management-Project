import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

/**
 * Lightweight, robust Markdown and rich-text formatter for AI Assistant responses
 * Handles headers, bold text, lists, code blocks, inline code, and tables without external dependencies.
 */
export const MarkdownMessage = ({ content = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyCode = (codeText, index) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  // Split content by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-xs sm:text-sm text-text-primary leading-relaxed break-words">
      {parts.map((part, partIdx) => {
        // Render Code Block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          let language = '';
          let codeBody = part.slice(3, -3);

          if (lines.length > 1 && !lines[0].includes(' ') && lines[0].length < 20) {
            language = lines[0].trim();
            codeBody = lines.slice(1).join('\n');
          }

          return (
            <div
              key={partIdx}
              className="my-3 rounded-2xl bg-[#0B0D11] border border-white/[0.08] overflow-hidden shadow-inner font-mono text-xs"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.02] border-b border-white/[0.06] text-text-muted text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language || 'code'}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(codeBody.trim(), partIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                  title="Copy code to clipboard"
                >
                  {copiedIndex === partIdx ? (
                    <>
                      <Check className="w-3 h-3 text-indigo-400" />
                      <span className="text-indigo-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-indigo-300 whitespace-pre">
                <code>{codeBody.trim()}</code>
              </pre>
            </div>
          );
        }

        // Render Standard Markdown Paragraphs & Blocks
        return (
          <div key={partIdx} className="space-y-2">
            {renderMarkdownParagraphs(part)}
          </div>
        );
      })}
    </div>
  );
};

function renderMarkdownParagraphs(text) {
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let isNumberedList = false;
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-1.5 text-text-secondary">
            {currentList.map((item, idx) => (
              <li key={idx}>{parseInlineFormatting(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-1.5 text-text-secondary">
            {currentList.map((item, idx) => (
              <li key={idx}>{parseInlineFormatting(item)}</li>
            ))}
          </ul>
        );
      }
      currentList = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter((r) => !r.every((c) => /^[-:| ]+$/.test(c)));

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white/[0.04] text-text-primary border-b border-white/[0.08]">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="p-2.5 font-semibold">
                    {parseInlineFormatting(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-text-secondary">
                      {parseInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line: flush lists & tables
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Markdown Table Detection (starts and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Unordered List item (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      currentList.push(ulMatch[1]);
      continue;
    }

    // Numbered List item (1. 2. etc)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!isNumberedList) flushList();
      isNumberedList = true;
      currentList.push(olMatch[1]);
      continue;
    }

    // If not a list item, flush any pending list
    flushList();

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm sm:text-base font-bold text-text-primary mt-3 mb-1 text-indigo-400">
          {parseInlineFormatting(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base sm:text-lg font-extrabold text-text-primary mt-4 mb-1.5 border-b border-white/[0.06] pb-1">
          {parseInlineFormatting(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg sm:text-xl font-black text-text-primary mt-4 mb-2">
          {parseInlineFormatting(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="pl-3.5 border-l-2 border-indigo-500/50 italic text-text-muted my-2">
          {parseInlineFormatting(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-text-secondary leading-relaxed">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return elements;
}

/**
 * Parse inline bold (**bold**), inline code (`code`), and links ([text](url))
 */
function parseInlineFormatting(text) {
  if (!text) return '';

  // Regex to match inline code (`...`), bold (**...** or __...__), and links ([...](...))
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 font-mono text-[11px] sm:text-xs font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold text (**...** or __...__)
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={index} className="font-bold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Links [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 underline hover:text-indigo-300 font-medium transition-colors"
        >
          {label}
        </a>
      );
    }

    return part;
  });
}
