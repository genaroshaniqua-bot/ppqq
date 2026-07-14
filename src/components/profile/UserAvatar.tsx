import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
};

export function UserAvatar({ src, name, className }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-purple to-pink font-black text-white",
        className
      )}
    >
      {src ? (
        // The source is a public Supabase Storage URL whose host is configured per environment.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (name?.trim().slice(0, 1) || <UserRound size="45%" />)}
    </span>
  );
}
