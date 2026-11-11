type Child = Node | string | number | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  style?: Record<string, string>;
  on?: { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void };
}

/** Tiny element builder. Uses plain DOM so it runs inside Obsidian and in the browser demo. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = createEl(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.attrs)
      for (const [k, v] of Object.entries(props.attrs)) {
        if (v === undefined || v === false) continue;
        el.setAttribute(k, v === true ? "" : String(v));
      }
    if (props.style) for (const [k, v] of Object.entries(props.style)) el.style.setProperty(k, v);
    if (props.on)
      for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn as EventListener);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "number" ? String(c) : c);
  }
  return el;
}

/** Lucide-style stroke icons (Obsidian's icon set), inlined so the demo needs no dependency. */
const ICONS: Record<string, string> = {
  check: "M20 6 9 17l-5-5",
  chevron: "m9 18 6-6-6-6",
  search: "M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  file: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  sparkles:
    "M9.94 14.06 4.5 19.5M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z",
  checks: "m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8",
  x: "M18 6 6 18M6 6l12 12",
  refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
};

export function icon(name: string, size = 16, cls = ""): SVGSVGElement {
  const svg = createSvg("svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `tr-icon ${cls}`.trim());
  const path = createSvg("path");
  path.setAttribute("d", ICONS[name] ?? "");
  svg.append(path);
  return svg;
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
