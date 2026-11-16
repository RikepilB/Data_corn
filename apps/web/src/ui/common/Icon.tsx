// Íconos de línea propios (24×24, trazo 1.8), sin dependencias.
const PATHS = {
  locate: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM20 20l-4.6-4.6',
  sample: 'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6ZM9 4v14M15 6v14',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 5l7 7-7 7',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7ZM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2M16 14h0.5',
  drop: 'M12 3.5c3.5 4.2 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 2.5-6.3 6-10.5Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  thermo: 'M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0ZM12 9v7',
  snow: 'M12 2v20M4 6.5l16 11M20 6.5l-16 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5',
  sprinkler: 'M12 20v-7M8 20h8M12 13c0-4-3-6-7-6M12 13c0-4 3-6 7-6M12 13V5M7 4l-1-1M17 4l1-1',
  waves: 'M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  rotate: 'M20 7a8 8 0 0 0-14.5 1M4 4v4h4M4 17a8 8 0 0 0 14.5-1M20 20v-4h-4',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  play: 'M8 5.5v13l10.5-6.5L8 5.5Z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  layers: 'M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  alert: 'M12 3l10 18H2L12 3ZM12 10v5M12 18h.01',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z',
  seed: 'M12 20c0-5 0-8-4-11M12 20c0-4 1-7 5-9M5 20h14M8 9c-2-1-3-3-3-5 2 0 4 1 5 3M17 11c1-2 3-3 4-3 0 2-1 4-3 5',
  leaf: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14ZM5 19l7-7',
  tassel: 'M12 21V9M12 9l-3-6M12 9l3-6M12 9V2M9 13c-2 0-4 1-5 3M15 13c2 0 4 1 5 3M10 21h4',
  grain: 'M12 3c3 2 4 5 4 9s-1 7-4 9c-3-2-4-5-4-9s1-7 4-9ZM12 7v10M9.5 9.5l2.5 1.5 2.5-1.5M9.5 13l2.5 1.5 2.5-1.5',
  tractor: 'M3 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM15 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM5 14V8h6l2 6M13 9h5l2 5v3h-1M9 17h6M8 8V5',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Zm0-13.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7.5h.01',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9v.5M12 17h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  label,
  className,
}: {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
