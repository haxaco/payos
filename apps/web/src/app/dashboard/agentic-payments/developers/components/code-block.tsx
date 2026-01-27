'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, cn } from '@sly/ui';

interface CodeBlockProps {
    code: string;
    language?: string;
    className?: string;
}

export function CodeBlock({ code, language = 'typescript', className }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("relative group rounded-lg overflow-hidden bg-gray-950 border border-gray-800", className)}>
            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-800 text-gray-400 hover:text-white border-gray-700"
                    onClick={handleCopy}
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                <span className="text-xs font-mono text-gray-400">{language}</span>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300">
                <code>{code}</code>
            </pre>
        </div>
    );
}
