import { Copy } from "lucide-react";
import type { CharacterContinuation } from "@/types/character";

type ContinuationCardProps = {
  item: CharacterContinuation;
  onCopy: () => void;
};

export function ContinuationCard({ item, onCopy }: ContinuationCardProps) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">Generated</p>
          <h3 className="mt-1 font-display text-xl font-black">{item.title}</h3>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="grid min-h-11 min-w-11 place-items-center rounded-pill bg-bg transition hover:bg-primary/15"
          aria-label={`复制 ${item.title}`}
        >
          <Copy size={17} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-sm leading-7 text-muted">{item.body}</p>
      <ul className="mt-4 space-y-2">
        {item.bullets.map((bullet) => (
          <li key={bullet} className="rounded-2xl bg-bg px-4 py-3 text-sm font-semibold leading-6 text-ink">
            {bullet}
          </li>
        ))}
      </ul>
    </article>
  );
}
