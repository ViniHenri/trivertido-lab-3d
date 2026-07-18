interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/**
 * Slider com trilho preenchido até o valor atual — o accent-color nativo
 * só colore o polegar em Firefox/Safari, deixando a posição pouco visível.
 * O gradiente aqui garante o preenchimento em qualquer navegador.
 */
export default function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: RangeSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex justify-between text-white/80">
        {label}
        <span className="text-white/45 tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lab-range"
        style={{
          background: `linear-gradient(to right, var(--color-clay) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
    </label>
  );
}
