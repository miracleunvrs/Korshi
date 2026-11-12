import NextImage from "next/image";

/** Photo when the person has one, otherwise their initials — never a stranger's stock photo. */
export default function Avatar({ url, name, size, className = "" }: { url?: string | null; name: string; size: number; className?: string }) {
  if (url) {
    return <NextImage src={url} alt={name} width={size} height={size} unoptimized className={`object-cover ${className}`} />;
  }
  const initials = name.trim().split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <span
      role="img"
      aria-label={name}
      className={`grid place-items-center bg-green-100 font-black text-green-800 ${className}`}
      style={{ fontSize: Math.max(11, Math.round(size / 2.8)) }}
    >
      {initials}
    </span>
  );
}
