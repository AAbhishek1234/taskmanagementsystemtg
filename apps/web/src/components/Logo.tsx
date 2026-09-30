import Image from "next/image";

export function Logo({
  size = 28,
  showWordmark = true,
  inverted = false,
}: {
  size?: number;
  showWordmark?: boolean;
  /** Use on dark backgrounds so the wordmark stays readable. */
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-lg bg-white p-1 shadow-sm"
        style={{ width: size + 8, height: size + 8 }}
      >
        <Image src="/logo-mark.png" alt="ThunderGits" width={size} height={size} priority style={{ width: size, height: size }} />
      </span>
      {showWordmark && (
        <span className={`text-base font-bold tracking-tight ${inverted ? "text-white" : "text-navy"}`}>
          Thunder<span className="text-orange">Gits</span>
        </span>
      )}
    </div>
  );
}
