import React from 'react';

/**
 * Parses text from AI and renders it beautifully — no raw markdown.
 * Handles: **bold**, *italic*, `code`, ```code blocks```,
 * # headings, - bullet lists, 1. numbered lists, lines/paragraphs.
 */
export function BeautifulMessage({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockIndex = 0;
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listIndex = 0;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${listIndex++}`} className="space-y-1 my-2 pl-1">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock) {
      const code = codeBlockContent.join('\n');
      elements.push(
        <div key={`code-${codeBlockIndex++}`} className="my-2.5 rounded-lg overflow-hidden border border-slate-700/50">
          <div className="bg-slate-800/80 px-3 py-1.5 text-[10px] text-slate-500 font-mono flex items-center gap-1.5 border-b border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <span className="w-2 h-2 rounded-full bg-green-500/60" />
            <span className="ml-2">code</span>
          </div>
          <pre className="bg-slate-900/80 px-3 py-2.5 text-[12px] leading-relaxed text-emerald-300/90 font-mono overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      );
      codeBlockContent = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line — paragraph break
    if (trimmed === '') {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-violet-300 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1 h-4 bg-gradient-to-b from-violet-400 to-indigo-500 rounded-full" />
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-violet-200 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-5 bg-gradient-to-b from-violet-400 to-indigo-500 rounded-full" />
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-bold text-white mt-3 mb-2 flex items-center gap-2">
          <span className="w-2 h-6 bg-gradient-to-b from-violet-400 to-indigo-500 rounded-full" />
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet list items
    if (/^[-*•]\s/.test(trimmed)) {
      inList = true;
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      listItems.push(
        <li key={`li-${i}`} className="flex items-start gap-2 text-slate-300">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
          <span className="flex-1">{renderInline(itemText)}</span>
        </li>
      );
      continue;
    }

    // Numbered list items
    if (/^\d+[.)]\s/.test(trimmed)) {
      inList = true;
      const match = trimmed.match(/^(\d+)[.)]\s+(.*)/);
      if (match) {
        const num = match[1];
        const itemText = match[2];
        listItems.push(
          <li key={`oli-${i}`} className="flex items-start gap-2 text-slate-300">
            <span className="mt-0.5 w-5 h-5 rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-violet-500/20">
              {num}
            </span>
            <span className="flex-1">{renderInline(itemText)}</span>
          </li>
        );
      }
      continue;
    }

    // Horizontal rule
    if (/^[-=*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`hr-${i}`} className="my-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-slate-300 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushCodeBlock();

  return <div className="space-y-0.5">{elements}</div>;
}

/** Renders inline formatting: **bold**, *italic*, `code`, [links](url) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex to match: **bold**, *italic*, `code`, [text](url)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(<React.Fragment key={`t-${keyIdx++}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-slate-100">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-200">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `code`
      parts.push(
        <code key={`c-${keyIdx++}`} className="px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-[12px] font-mono border border-violet-500/15">
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // [text](url)
      parts.push(
        <a key={`a-${keyIdx++}`} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
          {match[8]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`t-${keyIdx++}`}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return parts;
}
