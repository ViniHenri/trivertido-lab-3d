import Link from "next/link";

interface Tool {
  href: string;
  title: string;
  description: string;
  ready: boolean;
  badge?: string;
}

const TOOLS: Tool[] = [
  {
    href: "/vase",
    title: "Vase Maker",
    description: "Vasos personalizados com ondulações e twist, em tempo real.",
    ready: true,
  },
  {
    href: "/lithophane",
    title: "Lithophane Maker",
    description: "Sua foto vira litofania — a imagem aparece contra a luz.",
    ready: true,
  },
  {
    href: "/sign",
    title: "Sign & Plate Maker",
    description: "Placas e letreiros com texto em relevo ou rebaixado.",
    ready: true,
  },
  {
    href: "/image-to-3d",
    title: "Image to 3D",
    description: "Foto vira modelo 3D completo, gerado por IA.",
    ready: true,
    badge: "IA",
  },
  {
    href: "/keychain",
    title: "Image to Keychain",
    description: "Logo ou desenho vira chaveiro com furo pra argola.",
    ready: true,
  },
  {
    href: "/laser-box",
    title: "Laser Box Maker",
    description: "Caixas finger joint em SVG/DXF pra corte a laser.",
    ready: true,
  },
  {
    href: "/desk-organizer",
    title: "Desk Organizer",
    description: "Organizadores de mesa com grid de compartimentos.",
    ready: true,
  },
];

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto w-full px-4 py-12 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-orange-400 font-medium tracking-wide uppercase text-sm">
          Trivertido 3D
        </p>
        <h1 className="text-4xl font-bold">Trivertido Lab</h1>
        <p className="text-zinc-400 max-w-2xl">
          Customize e gere modelos 3D prontos pra impressão direto no
          navegador — sem saber nada de modelagem. Ajuste, veja o preview em 3D
          e baixe o arquivo ou peça a impressão pra gente.
        </p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-orange-500/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold group-hover:text-orange-400 transition-colors">
                {tool.title}
              </h2>
              {tool.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/30">
                  {tool.badge}
                </span>
              )}
              {!tool.ready && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                  em breve
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-2">{tool.description}</p>
          </Link>
        ))}
      </section>

      <footer className="text-sm text-zinc-600 border-t border-zinc-800 pt-6">
        Feito pela{" "}
        <a
          href="https://trivertido.com"
          className="text-zinc-400 hover:text-orange-400"
        >
          Trivertido 3D
        </a>{" "}
        — impressão 3D artesanal.
      </footer>
    </main>
  );
}
