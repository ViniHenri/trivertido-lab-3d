import ToolShell from "@/components/ui/ToolShell";
import ComingSoon from "@/components/ui/ComingSoon";

export default function LaserBoxPage() {
  return (
    <ToolShell
      title="Laser Box Maker"
      description="Caixas com encaixe finger joint, exportadas em SVG/DXF prontas pra corte a laser."
    >
      <ComingSoon phase="Fase 4" />
    </ToolShell>
  );
}
