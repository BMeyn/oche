interface AvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
} as const;

export function Avatar({ name, color, size = "sm" }: AvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={`${SIZE[size]} flex items-center justify-center f-mono font-bold shrink-0 select-none`}
      style={{ background: color, color: "#0a0e0c" }}
    >
      {initial}
    </div>
  );
}
