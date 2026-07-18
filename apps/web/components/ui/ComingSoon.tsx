export default function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
      <p className="text-lg font-medium text-white/80">Em construção</p>
      <p className="text-sm text-white/40 mt-1">
        Esta ferramenta chega na {phase} do roadmap do Lab.
      </p>
    </div>
  );
}
