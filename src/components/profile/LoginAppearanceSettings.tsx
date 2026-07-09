"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Check, Film, ImageIcon, Trash2, Upload } from "lucide-react";
import {
  DEFAULT_LOGIN_APPEARANCE,
  deleteCustomLoginBackground,
  readCustomLoginBackground,
  readLoginAppearance,
  saveCustomLoginBackground,
  saveLoginAppearance,
  type LoginAppearance
} from "@/lib/login-appearance";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

const options: Array<{
  id: Exclude<LoginAppearance, "custom">;
  title: string;
  description: string;
  icon: typeof ImageIcon;
}> = [
  {
    id: "silver-twins",
    title: "星辉双生",
    description: "银发双人插画，带缓慢镜头漂移与柔光变化。",
    icon: ImageIcon
  },
  {
    id: "ocean-video",
    title: "深海光影",
    description: "保留原有的深海鱼群循环视频背景。",
    icon: Film
  }
];

export function LoginAppearanceSettings() {
  const [selected, setSelected] = useState<LoginAppearance>(DEFAULT_LOGIN_APPEARANCE);
  const [saved, setSaved] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customType, setCustomType] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setSelected(readLoginAppearance());
    readCustomLoginBackground().then((background) => {
      if (!background) {
        return;
      }
      const url = URL.createObjectURL(background.blob);
      previewUrlRef.current = url;
      setCustomPreview(url);
      setCustomType(background.type);
      setCustomName(background.name);
    });

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function selectAppearance(appearance: LoginAppearance) {
    setSelected(appearance);
    saveLoginAppearance(appearance);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) {
      setUploadError("不支持该格式。请选择 JPG、PNG、WEBP、GIF、MP4 或 WEBM 文件。");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setUploadError("图片文件不能超过 8MB。");
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setUploadError("视频文件不能超过 30MB。");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    try {
      await saveCustomLoginBackground({ blob: file, name: file.name, type: file.type });
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setCustomPreview(url);
      setCustomType(file.type);
      setCustomName(file.name);
      selectAppearance("custom");
    } catch {
      setUploadError("文件保存失败，请检查浏览器存储空间后重试。");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeCustomBackground() {
    await deleteCustomLoginBackground();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCustomPreview(null);
    setCustomType(null);
    setCustomName("");
    setUploadError("");
    if (selected === "custom") {
      selectAppearance(DEFAULT_LOGIN_APPEARANCE);
    }
  }

  return (
    <section className="mt-8 border-t border-line pt-8" aria-labelledby="login-style-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase text-primary">Settings</p>
          <h2 id="login-style-heading" className="mt-1 font-display text-3xl font-black">
            登录页面样式
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">选择预设背景，或上传你自己的图片、动图和视频。</p>
        </div>
        <p className={cn("text-sm font-bold text-primary transition-opacity", saved ? "opacity-100" : "opacity-0")} aria-live="polite">
          已保存
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const active = selected === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectAppearance(option.id)}
              aria-pressed={active}
              className={cn(
                "group overflow-hidden rounded-lg border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-soft",
                active ? "border-ink ring-2 ring-ink/10" : "border-line"
              )}
            >
              <span className="relative block aspect-[16/7] overflow-hidden bg-ink">
                {option.id === "silver-twins" ? (
                  <Image
                    src="/images/login-silver-twins.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(84,197,183,0.35),transparent_25%),linear-gradient(135deg,#061018,#102b35_55%,#030608)]" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                {active ? (
                  <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white text-ink">
                    <Check size={17} aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="flex items-start gap-3 p-4">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-ink text-white" : "bg-bg text-muted")}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-base font-black">{option.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{option.description}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <article
        className={cn(
          "mt-4 overflow-hidden rounded-lg border bg-white transition",
          selected === "custom" ? "border-ink ring-2 ring-ink/10" : "border-line"
        )}
      >
        <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
          <div className="relative min-h-56 overflow-hidden bg-ink">
            {customPreview ? (
              customType?.startsWith("video/") ? (
                <video src={customPreview} autoPlay muted loop playsInline className="absolute h-full w-full object-cover" />
              ) : (
                // A blob URL cannot use next/image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customPreview} alt="自定义登录背景预览" className="absolute h-full w-full object-cover" />
              )
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#111318,#26303a)] text-white/45">
                <Upload size={42} aria-hidden="true" />
              </div>
            )}
            {selected === "custom" ? (
              <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white text-ink">
                <Check size={17} aria-hidden="true" />
              </span>
            ) : null}
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-6">
            <p className="text-xs font-black uppercase text-primary">Custom background</p>
            <h3 className="mt-1 font-display text-2xl font-black">上传自定义背景</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              图片：JPG、PNG、WEBP、GIF，最大 8MB。
              <br />
              视频：MP4、WEBM，最大 30MB。
            </p>
            {customName ? <p className="mt-3 truncate text-xs font-bold text-ink">当前文件：{customName}</p> : null}
            {uploadError ? (
              <p className="mt-3 text-sm font-bold text-danger" role="alert">
                {uploadError}
              </p>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="选择登录背景文件"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:bg-primary hover:text-ink disabled:cursor-wait disabled:opacity-60"
              >
                <Upload size={17} aria-hidden="true" />
                {isUploading ? "正在保存" : customPreview ? "更换文件" : "选择文件"}
              </button>
              {customPreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => selectAppearance("custom")}
                    disabled={selected === "custom"}
                    className="min-h-11 rounded-lg border border-line px-4 text-sm font-black transition hover:border-ink disabled:opacity-45"
                  >
                    使用此背景
                  </button>
                  <button
                    type="button"
                    onClick={removeCustomBackground}
                    className="grid size-11 place-items-center rounded-lg text-danger transition hover:bg-danger/10"
                    aria-label="删除自定义登录背景"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
