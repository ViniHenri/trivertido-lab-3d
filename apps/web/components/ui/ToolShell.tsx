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
    <main className="max-w-6xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-orange-400 hover:underline">
          ← Trivertido Lab
        </Link>
        <h1 className="text-2xl font-bold mt-2">{title}</h1>
        <p className="text-zinc-400 mt-1">{description}</p>
      </div>
      {children}
    </main>
  );
}
