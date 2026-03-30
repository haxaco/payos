'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@sly/ui';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

/** Simple regex-based syntax coloring for common patterns. */
function highlightLine(line: string): React.ReactNode[] {
  // Order matters: earlier rules take priority via greedy matching
  const rules: Array<{
    pattern: RegExp;
    className: string;
  }> = [
    // Comments (# or //)
    { pattern: /(#.*)$/, className: 'text-gray-500' },
    { pattern: /(\/\/.*)$/, className: 'text-gray-500' },
    // Strings (single or double quoted)
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,
      className: 'text-emerald-400',
    },
    // URLs
    {
      pattern: /(https?:\/\/[^\s"'`]+)/,
      className: 'text-amber-300',
    },
    // Flags (--flag or -H style)
    {
      pattern: /(\s)(--?[a-zA-Z][\w-]*)/,
      className: 'text-purple-400',
    },
    // Keywords
    {
      pattern:
        /\b(curl|npm|npx|pnpm|yarn|import|export|from|const|let|var|await|async|function|return|if|else|new)\b/,
      className: 'text-blue-400',
    },
  ];

  const segments: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      length: number;
      text: string;
      className: string;
      prefixLen: number;
    } | null = null;

    for (const rule of rules) {
      const match = rule.pattern.exec(remaining);
      if (match) {
        // Use the first capturing group if available
        const captureIndex = match.index + (match[0].length - match[1].length);
        const captureText = match[1];
        // For flags, the regex captures leading space + flag text
        // We need the prefix (text before the captured group)
        const prefixLen =
          rule.className === 'text-purple-400'
            ? match.index + 1 // skip the matched space
            : captureIndex;
        const text =
          rule.className === 'text-purple-400' ? match[2] : captureText;
        const idx =
          rule.className === 'text-purple-400'
            ? match.index + match[0].indexOf(match[2])
            : captureIndex;

        if (!earliestMatch || idx < earliestMatch.index) {
          earliestMatch = {
            index: idx,
            length: text.length,
            text,
            className: rule.className,
            prefixLen: idx,
          };
        }
      }
    }

    if (earliestMatch) {
      // Push plain text before match
      if (earliestMatch.prefixLen > 0) {
        segments.push(
          <span key={key++}>{remaining.slice(0, earliestMatch.prefixLen)}</span>
        );
      }
      // Push highlighted match
      segments.push(
        <span key={key++} className={earliestMatch.className}>
          {earliestMatch.text}
        </span>
      );
      remaining = remaining.slice(
        earliestMatch.index + earliestMatch.length
      );
    } else {
      segments.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return segments;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [code]);

  const lines = useMemo(() => code.split('\n'), [code]);

  return (
    <div
      className={cn(
        'relative rounded-lg border border-white/[0.06] bg-black/40 overflow-hidden',
        className
      )}
    >
      {/* Header bar with language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        {language ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
            {language}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto p-4">
        <pre className="text-sm leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-4 inline-block w-6 flex-shrink-0 select-none text-right text-white/20 tabular-nums">
                  {i + 1}
                </span>
                <span className="text-white/80">{highlightLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
