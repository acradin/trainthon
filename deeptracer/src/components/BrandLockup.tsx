import Image from "next/image";
import Link from "next/link";

interface BrandLockupProps {
  compact?: boolean;
}

export default function BrandLockup({ compact = false }: BrandLockupProps) {
  const icon = compact ? "h-6 w-6" : "h-7 w-7";
  const wordmark = compact ? "h-6 w-auto" : "h-7 w-auto";

  return (
    <Link href="/" className="flex items-center gap-2" aria-label="DeepTracer home">
      <Image
        src="/icon-192.png"
        alt=""
        width={28}
        height={28}
        className={`${icon} shrink-0`}
        priority
      />
      <Image
        src="/logo-dark.png"
        alt="deeptracer"
        width={154}
        height={40}
        className={wordmark}
        priority
      />
    </Link>
  );
}
