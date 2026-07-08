import { Copy, Save } from "lucide-react";
import type { Character } from "@/types/character";
import { Button } from "@/components/ui/Button";

type CharacterResultProps = {
  character: Character;
  onCopy: () => void;
  onSave: () => void;
};

export function CharacterResult({ character, onCopy, onSave }: CharacterResultProps) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="surface-grid p-5">
          <div className="rounded-card bg-ink p-5 text-white shadow-soft">
            <p className="text-xs font-black uppercase text-lime">OC CARD</p>
            <h2 className="mt-3 font-display text-3xl font-black">{character.name}</h2>
            <p className="mt-2 text-sm font-bold text-white/72">
              {character.gender} / {character.ageStage} / {character.identity}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {character.tags.map((tag) => (
                <span key={tag} className="rounded-pill bg-white/12 px-3 py-1 text-xs font-bold">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-6 text-base leading-7">{character.summary}</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <InfoBlock title="外貌特征" body={character.appearance} />
          <InfoBlock title="性格关键词" body={character.personality.join(" / ")} />
          <InfoBlock title="背景故事" body={character.background} />
          <InfoBlock title="能力 / 特长" body={character.ability} />
          <InfoBlock title="弱点 / 冲突点" body={character.weakness} />
          <InfoBlock title="口癖 / 说话方式" body={character.speech} />
          <InfoBlock title="创作备注" body={character.notes} />

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row">
            <Button type="button" onClick={onCopy} variant="secondary" className="flex-1">
              <Copy size={17} aria-hidden="true" />
              复制结果
            </Button>
            <Button type="button" onClick={onSave} className="flex-1">
              <Save size={17} aria-hidden="true" />
              保存到角色库
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
