'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Carregado sob demanda: só quando a primeira resposta da IA aparece. */
export default function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ a: ({ node, ...props }) => { void node; return <a {...props} target="_blank" rel="noopener noreferrer nofollow" />; } }}
    >
      {text}
    </ReactMarkdown>
  );
}
