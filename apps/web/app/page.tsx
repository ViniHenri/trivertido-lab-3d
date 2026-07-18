import Link from "next/link";
import {
  VaseIcon,
  LithophaneIcon,
  SignIcon,
  KeychainIcon,
  LaserBoxIcon,
  DeskOrganizerIcon,
  SparkleIcon,
} from "@/components/ui/ToolIcons";

interface Tool {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType;
}

const TOOLS: Tool[] = [
  {
    href: "/vase",
    title: "Vase Maker",
    description: "Ondulações e twist ajustados em tempo real.",
    icon: VaseIcon,
  },
  {
    href: "/lithophane",
    title: "Lithophane Maker",
    description: "Sua foto aparece contra a luz, em relevo.",
    icon: LithophaneIcon,
  },
  {
    href: "/sign",
    title: "Sign & Plate Maker",
    description: "Texto em relevo ou gravado, na forma que quiser.",
    icon: SignIcon,
  },
  {
    href: "/keychain",
    title: "Image to Keychain",
    description: "Logo ou desenho vira chaveiro com argola.",
    icon: KeychainIcon,
  },
  {
    href: "/laser-box",
    title: "Laser Box Maker",
    description: "Encaixes finger joint, pronto pro corte a laser.",
    icon: LaserBoxIcon,
  },
  {
    href: "/desk-organizer",
    title: "Desk Organizer",
    description: "Compartimentos sob medida pra sua mesa.",
    icon: DeskOrganizerIcon,
  },
];

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto w-full px-6 py-16 sm:py-24 flex flex-col gap-24 sm:gap-32">
      <section className="flex flex-col gap-8">
        <p className="font-mono text-xs tracking-[0.2em] text-clay uppercase">
          Trivertido 3D
        </p>

        <h1 className="text-[2.75rem] sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-2xl">
          Uma foto.
          <br />
          Um modelo 3D.
        </h1>

        <p className="text-white/55 text-lg max-w-lg leading-relaxed">
          Gere peças prontas pra impressão a partir de uma imagem, ou
          personalize vasos, placas e outros objetos direto no navegador —
          sem saber nada de modelagem.
        </p>

        {/* CTA principal — a peça central da página */}
        <Link
          href="/image-to-3d"
          className="group relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center gap-8 transition-colors hover:border-clay/40"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-clay/25 blur-[90px] transition-opacity group-hover:opacity-80"
          />

          <div className="relative flex flex-1 flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-clay/30 bg-clay/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-clay uppercase">
              <SparkleIcon />
              Novo · IA generativa
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Image to 3D
            </h2>
            <p className="text-white/55 max-w-md">
              Envie uma foto e receba um modelo 3D completo em minutos,
              pronto pra visualizar, baixar ou mandar pra impressão.
            </p>
          </div>

          <div className="relative flex items-center gap-2 shrink-0 rounded-full bg-clay px-6 py-3 font-medium text-[#1a0e06] w-fit transition-colors group-hover:bg-clay-soft">
            Experimentar
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </Link>
      </section>

      <section className="flex flex-col gap-8">
        <p className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase">
          Ferramentas paramétricas — sem custo de IA
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden bg-white/10">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group bg-background p-6 flex flex-col gap-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="text-white/70 group-hover:text-clay transition-colors">
                  <Icon />
                </div>
                <div>
                  <h3 className="font-medium">{tool.title}</h3>
                  <p className="text-sm text-white/45 mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="text-sm text-white/30 border-t border-white/10 pt-8">
        Feito pela{" "}
        <a
          href="https://trivertido.com"
          className="text-white/50 hover:text-clay transition-colors"
        >
          Trivertido 3D
        </a>{" "}
        — impressão 3D artesanal.
      </footer>
    </main>
  );
}
