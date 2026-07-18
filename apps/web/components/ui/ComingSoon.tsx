export default function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-10 text-center">
      <p className="text-lg font-medium text-zinc-300">Em construção</p>
      <p className="text-sm text-zinc-500 mt-1">
        Esta ferramenta chega na {phase} do roadmap do Lab.
      </p>
    </div>
  );
}
