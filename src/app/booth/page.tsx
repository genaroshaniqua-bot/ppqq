"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, Loader2, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { boothPlatforms } from "@/data/mock-generations";
import { generateBooth } from "@/lib/mock-generate";
import type { BoothInput, BoothOutput } from "@/types/booth";

const initialInput: BoothInput = {
  eventName: "",
  boothName: "",
  productInfo: "",
  platform: "小红书",
  tone: "清爽热情"
};

export default function BoothPage() {
  const [input, setInput] = useState<BoothInput>(initialInput);
  const [status, setStatus] = useState<"empty" | "loading" | "error" | "result">("empty");
  const [output, setOutput] = useState<BoothOutput | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function update<K extends keyof BoothInput>(key: K, value: BoothInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function generate() {
    if (!input.productInfo.trim()) {
      setStatus("error");
      setError("请至少输入商品信息，例如“OC 徽章、立牌、小卡套组”。");
      return;
    }

    setStatus("loading");
    setError("");
    window.setTimeout(() => {
      setOutput(generateBooth(input));
      setStatus("result");
    }, 620);
  }

  async function copyAll() {
    if (!output) return;
    await navigator.clipboard.writeText(
      `${output.headline}\n\n${output.copy}\n\n${output.tags.join(" ")}\n\n商品菜单\n${output.menu.join("\n")}\n\n价格牌\n${output.priceCard.join("\n")}`
    );
    setToast("摊宣结果已复制");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 grid gap-6 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div><p className="text-xs font-black uppercase text-primary">Booth Toolkit</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">摊宣 / 漫展工具</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">输入摊位和商品信息，生成适配平台的摊宣文案、商品菜单和价格牌说明。</p>
        </div>
        <FeatureArtPanel src="/images/case-sheet.png" alt="角色徽章、亚克力立牌和宣传卡组成的漫展摊位物料" eyebrow="摊宣物料预览" caption="把角色设定整理成菜单、价格牌与社交平台宣传素材" className="min-h-[220px]" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="h-fit rounded-card border border-line bg-white p-5 shadow-soft">
          <div className="space-y-5">
            <Field label="展会 / 时间" value={input.eventName} onChange={(value) => update("eventName", value)} placeholder="例如：CP 周六场 / 本周末场贩" />
            <Field label="摊位 / 社团名" value={input.boothName} onChange={(value) => update("boothName", value)} placeholder="例如：星屑创作社 A12" />
            <label>
              <span className="text-sm font-black">
                商品信息 <span className="text-danger">*</span>
              </span>
              <textarea
                value={input.productInfo}
                onChange={(event) => update("productInfo", event.target.value)}
                rows={5}
                className="mt-2 w-full rounded-[24px] border border-line bg-bg px-4 py-3 text-base leading-7 outline-none focus:border-primary"
                placeholder="例如：OC 徽章 3 款、亚克力立牌、小卡套组，主色是薄荷绿和粉紫"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-black">平台选择</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {boothPlatforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => update("platform", platform)}
                    className={`min-h-11 rounded-pill px-4 text-sm font-black transition ${
                      input.platform === platform ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </fieldset>

            <Field label="语气风格" value={input.tone} onChange={(value) => update("tone", value)} placeholder="例如：清爽热情 / 俏皮 / 直接清晰" />

            <Button type="button" onClick={generate} disabled={status === "loading"} className="w-full">
              {status === "loading" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Store size={18} aria-hidden="true" />}
              {status === "loading" ? "生成中" : "生成摊宣内容"}
            </Button>
          </div>
        </section>

        <div className="space-y-5">
          {status === "empty" ? (
            <section className="surface-grid rounded-card border border-dashed border-line bg-white p-8 text-center shadow-soft">
              <p className="mx-auto grid size-14 place-items-center rounded-pill bg-pink/20">
                <Store size={24} aria-hidden="true" />
              </p>
              <h2 className="mt-4 font-display text-2xl font-black">结果会按平台语气生成</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">小红书偏标题和标签，微博适合扩散，QQ 群更直接，B 站动态更像创作者说明。</p>
            </section>
          ) : null}

          {status === "loading" ? (
            <section className="rounded-card border border-line bg-white p-5 shadow-soft" aria-busy="true">
              <div className="space-y-4">
                <div className="h-7 w-1/2 animate-pulse rounded-pill bg-bg" />
                <div className="h-32 animate-pulse rounded-card bg-bg" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-32 animate-pulse rounded-card bg-bg" />
                  <div className="h-32 animate-pulse rounded-card bg-bg" />
                </div>
              </div>
            </section>
          ) : null}

          {status === "error" ? (
            <section role="alert" className="rounded-card border border-danger/30 bg-white p-5 shadow-soft">
              <div className="flex gap-3">
                <AlertCircle className="mt-1 text-danger" size={22} aria-hidden="true" />
                <div>
                  <h2 className="font-display text-xl font-black">还不能生成</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
                </div>
              </div>
            </section>
          ) : null}

          {status === "result" && output ? (
            <section className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black uppercase text-primary">{input.platform}</p>
                  <h2 className="mt-1 font-display text-3xl font-black">{output.headline}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyAll}
                    className="grid min-h-11 min-w-11 place-items-center rounded-pill bg-bg transition hover:bg-primary/15"
                    aria-label="复制全部摊宣结果"
                  >
                    <Copy size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={generate}
                    className="grid min-h-11 min-w-11 place-items-center rounded-pill bg-ink text-white transition hover:bg-primary hover:text-ink"
                    aria-label="重新生成摊宣结果"
                  >
                    <RefreshCw size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                <OutputBlock title="摊宣文案" lines={[output.copy, output.tags.join(" ")]} />
                <div className="grid gap-5 md:grid-cols-2">
                  <OutputBlock title="商品菜单" lines={output.menu} />
                  <OutputBlock title="价格牌文案" lines={output.priceCard} />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="text-sm font-black">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-base outline-none focus:border-primary"
        placeholder={placeholder}
      />
    </label>
  );
}

function OutputBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-card bg-bg p-4">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-muted">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
