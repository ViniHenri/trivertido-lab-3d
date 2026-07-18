import Link from "next/link";

export default function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-6xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="w-fit font-mono text-xs tracking-wider text-white/40 hover:text-mint transition-colors uppercase"
        >
          ← Trivertido Lab
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-white/50 max-w-xl">{description}</p>
      </div>
      {children}
    </main>
  );
}
