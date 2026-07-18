/**
 * Ícones de linha próprios do Lab — traço 1.5, 24x24, sem biblioteca externa.
 * Cada glifo é uma leitura minimalista do objeto físico da ferramenta.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "w-6 h-6",
};

export function VaseIcon() {
  return (
    <svg {...base}>
      <path d="M9.5 3h5M10 3c-.6 2.2-1 3.4-1 4.5 0 1.6-2 3-2 6.5 0 3.5 2.2 6 4.5 6h1c2.3 0 4.5-2.5 4.5-6 0-3.5-2-4.9-2-6.5 0-1.1-.4-2.3-1-4.5" />
    </svg>
  );
}

export function LithophaneIcon() {
  return (
    <svg {...base}>
      <circle cx="16.5" cy="7.5" r="1.5" />
      <rect x="3" y="5" width="14" height="14" rx="1.5" transform="translate(4 0)" />
      <path d="M4.5 15.5 8 11l3 3.5 2.5-3L18.5 17" />
    </svg>
  );
}

export function SignIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7.5 10.5h9M7.5 13.5h5.5" />
    </svg>
  );
}

export function KeychainIcon() {
  return (
    <svg {...base}>
      <circle cx="8" cy="7" r="3.25" />
      <path d="M10.3 9.3 18 17M14.5 12.8l2.3-2.3M17 15.3l2.3-2.3" />
    </svg>
  );
}

export function LaserBoxIcon() {
  return (
    <svg {...base}>
      <path d="M4 8.5 12 5l8 3.5M4 8.5v8L12 20m-8-3.5L12 20m0 0 8-3.5v-8M12 20v-8M4 8.5 12 12m0 0 8-3.5" />
    </svg>
  );
}

export function DeskOrganizerIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M10 5v14M3.5 12h6.5M15 5v14" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg {...base}>
      <path d="M12 4v3.5M12 16.5V20M4 12h3.5M16.5 12H20M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}
