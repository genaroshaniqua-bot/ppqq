import Image from "next/image";
import Link from "next/link";
import { BookOpen, PenLine, Trash2 } from "lucide-react";
import type { Character } from "@/types/character";
import { cn } from "@/lib/utils";

type CharacterCardProps = {
  character: Character;
  compact?: boolean;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
};

export function CharacterCard({ character, compact = false, onEdit, onDelete }: CharacterCardProps) {
  return (
    <article className={cn("group min-w-[280px] snap-start overflow-hidden rounded-card border border-line bg-white shadow-soft", compact ? "w-[280px]" : "w-full")}>
      <Link href={`/characters/${character.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-bg">
          <Image
            src="/images/case-sheet.png"
            alt={`${character.name} 的案例图`}
            fill
            sizes="(max-width: 768px) 80vw, 340px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            style={{ objectPosition: character.imagePosition }}
          />
          <div className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1 text-xs font-black text-ink backdrop-blur">
            {character.type}
          </div>
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <Link href={`/characters/${character.id}`} className="min-w-0">
              <h3 className="truncate font-display text-xl font-black">{character.name}</h3>
              <p className="mt-1 text-sm font-semibold text-muted">{character.identity}</p>
            </Link>
            <span className="size-4 shrink-0 rounded-pill" style={{ backgroundColor: character.color }} aria-hidden="true" />
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{character.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {character.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-pill bg-bg px-3 py-1 text-xs font-bold text-muted">
              {tag}
            </span>
          ))}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => onEdit?.(character)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-bg px-3 text-sm font-black transition hover:bg-primary/15"
            >
              <PenLine size={16} aria-hidden="true" />
              编辑
            </button>
            <Link
              href={`/characters/${character.id}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-3 text-sm font-black text-white transition hover:bg-primary hover:text-ink"
            >
              <BookOpen size={16} aria-hidden="true" />
              详情
            </Link>
            <button
              type="button"
              onClick={() => onDelete?.(character)}
              className="grid min-h-11 w-11 place-items-center rounded-pill bg-bg text-danger transition hover:bg-danger hover:text-white"
              aria-label={`删除 ${character.name}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
