import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="terminal-grid absolute inset-0 opacity-100" />
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(16,185,129,0.08),transparent_70%)]" />
      </div>

      <main className="page-enter w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <BrandLogo priority />
        </Link>

        <div className="card p-8 shadow-2xl shadow-black/20">{children}</div>
      </main>
    </div>
  );
}
