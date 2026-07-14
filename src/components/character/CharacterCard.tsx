import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BookOpen, Heart, LockKeyhole, PenLine, Shirt, Sparkles, Trash2, UserRound } from "lucide-react";
import type { Character } from "@/types/character";

type CharacterCardProps = {
  character: Character;
  compact?: boolean;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
};

const artworkByStyle: Record<Character["style"], string> = {
  "赛博幻想": "/images/artwork/starlight-mage.png",
  "校园怪谈": "/images/artwork/city-glasses.jpg",
  "国风异能": "/images/artwork/pink-fish.jpg",
  "废土偶像": "/images/artwork/neon-street.jpg",
  "日常治愈": "/images/artwork/pink-cafe.jpg"
};

function ArchiveField({ icon: Icon, label, children }: { icon: typeof Sparkles; label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#ecdeda] pt-3">
      <p className="flex items-center gap-2 text-xs font-black text-[#9c9597]"><Icon size={15} aria-hidden="true" />{label}</p>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-ink">{children}</p>
    </section>
  );
}

export function CharacterCard({ character, compact = false, onEdit, onDelete }: CharacterCardProps) {
  const hasActions = Boolean(onEdit || onDelete);
  const archiveYear = new Date(character.createdAt).getFullYear();

  return (
    <article className={`group relative overflow-hidden rounded-card border border-[#eadedb] bg-[#fffaf9] shadow-[0_22px_55px_rgba(72,45,55,0.1)] ${compact ? "" : "xl:min-h-[650px]"}`}>
      <div className="pointer-events-none absolute left-5 top-8 hidden h-[calc(100%-4rem)] w-[38%] -rotate-[5deg] border border-pink/20 bg-pink/5 xl:block" aria-hidden="true" />

      <div className={`relative grid xl:block ${compact ? "" : "xl:min-h-[650px]"}`}>
        <section className="order-2 border-t border-[#ecdeda] bg-[#fffefd] p-6 sm:p-8 xl:absolute xl:inset-y-9 xl:left-12 xl:w-[38%] xl:border xl:border-[#eadedb] xl:px-12 xl:py-16">
          <p className="font-display text-3xl font-black text-ink">角色档案</p>
          <p className="mt-1 text-xs font-black tracking-[0.14em] text-[#aaa0a2]">CHARACTER ARCHIVE</p>
          <div className="mt-9 grid gap-5 text-sm">
            <div><p className="text-xs font-bold text-[#a49b9d]">本名</p><p className="mt-1 font-display text-xl font-black text-ink">{character.name}</p></div>
            <div><p className="text-xs font-bold text-[#a49b9d]">身份</p><p className="mt-1 font-semibold leading-6 text-ink">{character.identity}</p></div>
            <div><p className="text-xs font-bold text-[#a49b9d]">年龄 / 外观年龄</p><p className="mt-1 font-semibold text-ink">{character.ageStage}</p></div>
            <div><p className="text-xs font-bold text-[#a49b9d]">角色定位</p><p className="mt-1 font-semibold text-ink">{character.type}</p></div>
            <div><p className="text-xs font-bold text-[#a49b9d]">创作标签</p><p className="mt-1 font-semibold leading-6 text-ink">{character.tags.slice(0, 2).join(" · ")}</p></div>
          </div>
        </section>

        <Link href={`/characters/${character.id}`} className="relative order-1 block min-h-[520px] overflow-hidden bg-[#f7f3f4] sm:min-h-[560px] xl:absolute xl:inset-y-[-8px] xl:left-[32%] xl:z-10 xl:w-[36%] xl:rounded-[30px] xl:border-[12px] xl:border-white xl:shadow-[0_20px_40px_rgba(44,31,48,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-primary">
          <Image src={artworkByStyle[character.style]} alt={`${character.name} 的角色档案立绘`} fill sizes="(max-width: 1279px) 100vw, 36vw" className="object-contain p-1 transition duration-500 group-hover:scale-[1.015]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/30 to-transparent" />
          <span className="absolute bottom-4 left-4 rounded-pill bg-white/88 px-3 py-1.5 text-xs font-black text-ink backdrop-blur">{character.style}</span>
        </Link>

        <section className="order-3 p-6 sm:p-8 xl:absolute xl:inset-y-7 xl:right-8 xl:w-[53%] xl:overflow-y-auto xl:border xl:border-[#eadedb] xl:bg-white xl:py-9 xl:pl-[40%] xl:pr-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-display text-2xl font-black text-ink">{character.name}</h3>
            <span className="rounded-lg border border-[#e5d7d7] bg-[#fffdfd] px-3 py-1 text-xs font-black text-muted">v{archiveYear}.1</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/12 px-3 py-1.5 text-xs font-black text-[#229a83]"><BadgeCheck size={14} aria-hidden="true" />已确认</span><span className="inline-flex items-center gap-1.5 rounded-pill bg-purple/10 px-3 py-1.5 text-xs font-black text-purple"><Sparkles size={14} aria-hidden="true" />AI 建议</span><span className="inline-flex items-center gap-1.5 rounded-pill bg-blue/10 px-3 py-1.5 text-xs font-black text-blue"><LockKeyhole size={14} aria-hidden="true" />已锁定</span></div>

          <div className="mt-5 grid gap-3">
            <ArchiveField icon={UserRound} label="特质">{character.personality.join(" · ")}</ArchiveField>
            <ArchiveField icon={Shirt} label="服装">{character.appearance}</ArchiveField>
            <ArchiveField icon={Heart} label="情绪倾向">{character.summary}</ArchiveField>
            <ArchiveField icon={Sparkles} label="世界观笔记">{character.background}</ArchiveField>
          </div>

          <div className="mt-5 flex flex-col gap-2 xl:mt-4">
            {hasActions ? <button type="button" onClick={() => onEdit?.(character)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-purple/25 bg-purple/5 px-4 text-sm font-black text-purple transition hover:bg-purple/10"><PenLine size={16} aria-hidden="true" />AI 建议优化</button> : null}
            <div className="flex gap-2"><Link href={`/characters/${character.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-4 text-sm font-black text-white transition hover:bg-primary hover:text-ink"><BookOpen size={16} aria-hidden="true" />完整档案</Link>{hasActions ? <button type="button" onClick={() => onDelete?.(character)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-bg px-4 text-sm font-black text-danger transition hover:bg-danger hover:text-white" aria-label={`删除 ${character.name}`}><Trash2 size={16} aria-hidden="true" />删除</button> : null}</div>
          </div>
        </section>
      </div>
    </article>
  );
}
