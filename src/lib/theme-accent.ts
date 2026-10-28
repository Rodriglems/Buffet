export const COR_IDS = [
  "grafite",
  "teal",
  "azul",
  "verde",
  "vinho",
  "ambar",
  "violeta",
  "laranja",
  "vermelho",
  "rosa",
  "marinho",
  "oliva",
  "marrom",
] as const;

export type CorSistema = (typeof COR_IDS)[number];

export const CORES_SISTEMA: { id: CorSistema; label: string; swatch: string }[] = [
  { id: "grafite", label: "Grafite", swatch: "var(--swatch-grafite)" },
  { id: "teal", label: "Verde-água", swatch: "var(--swatch-teal)" },
  { id: "azul", label: "Azul", swatch: "var(--swatch-azul)" },
  { id: "verde", label: "Verde", swatch: "var(--swatch-verde)" },
  { id: "vinho", label: "Vinho", swatch: "var(--swatch-vinho)" },
  { id: "ambar", label: "Âmbar", swatch: "var(--swatch-ambar)" },
  { id: "violeta", label: "Violeta", swatch: "var(--swatch-violeta)" },
  { id: "laranja", label: "Laranja", swatch: "var(--swatch-laranja)" },
  { id: "vermelho", label: "Vermelho", swatch: "var(--swatch-vermelho)" },
  { id: "rosa", label: "Rosa", swatch: "var(--swatch-rosa)" },
  { id: "marinho", label: "Azul-marinho", swatch: "var(--swatch-marinho)" },
  { id: "oliva", label: "Oliva", swatch: "var(--swatch-oliva)" },
  { id: "marrom", label: "Marrom", swatch: "var(--swatch-marrom)" },
];

const STORAGE_KEY = "mesa-accent";

export function corValida(value: string | null | undefined): CorSistema {
  return CORES_SISTEMA.some((cor) => cor.id === value) ? (value as CorSistema) : "grafite";
}

export function aplicarCor(value: string | null | undefined) {
  if (typeof document === "undefined") return;
  const cor = corValida(value);
  if (cor === "grafite") document.documentElement.removeAttribute("data-accent");
  else document.documentElement.setAttribute("data-accent", cor);
  window.localStorage.setItem(STORAGE_KEY, cor);
}
