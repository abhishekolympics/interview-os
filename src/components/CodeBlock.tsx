import { useState } from 'react';

interface Props {
  code: string;
  lang?: string;
  filename?: string;
  lines?: string;
  highlight?: number[];
}

export default function CodeBlock({ code, filename, lines }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const codeLines = code.split('\n');

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 bg-surface-900">
      {(filename || lines) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-surface-950/60">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warn-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent-400/60" />
            </div>
            {filename && (
              <span className="text-xs font-mono text-gray-400">{filename}</span>
            )}
            {lines && (
              <span className="text-xs font-mono text-gray-600">L{lines}</span>
            )}
          </div>
          <button
            onClick={copy}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
          >
            {copied ? 'copied!' : 'copy'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <pre className="p-4 text-sm leading-6">
          {codeLines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none w-10 shrink-0 text-right text-gray-700 mr-4 text-xs leading-6">
                {i + 1}
              </span>
              <span className="font-mono text-gray-300">{line || ' '}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
