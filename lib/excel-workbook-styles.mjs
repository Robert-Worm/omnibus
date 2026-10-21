import { exportPalettes, exportTypography, paletteTextColor, exportPhasePalette } from './export-design.mjs';
export const columnName = (n) => {
  let s = "";
  for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
export const exportStyles = [
  { fill: "FFFFFF", color: "24364B" },
  { fill: "234F7C", color: "FFFFFF", bold: true },
  { fill: "FFFFFF", color: "193E65", bold: true, size: 16 },
  { fill: "FFFFFF", color: "596E83" },
  { fill: "EEF3F8", color: "24364B" },
  { fill: "FFF8E7", color: "24364B" },
  { fill: "FFFFFF", color: "24364B", date: true },
  ...[
    ["234F7C", "DCE8F2"],
    ["287050", "E2EFE8"],
    ["946700", "F7EAC9"],
    ["586571", "E9EDF0"],
    ["695478", "EDE7F2"],
  ].flatMap(([dark, light]) => [
    { fill: dark, color: "FFFFFF", bold: true },
    { fill: light, color: "24364B", bold: true },
  ]),
  { fill: "EAF0F6", color: "24364B" },
  { fill: "FFFFFF", color: "234F7C", bold: true },
  { fill: "EDF3F9", color: "234F7C" },
  // Explicit body format: Excel treats cellXf 0 as Normal during table refresh.
  { fill: "FFFFFF", color: "24364B" },
  { fill: "FFF8E7", color: "24364B", text: true },
  { fill: "FFFFFF", color: "24364B", bold:true, text: true },
];
export const exportAccents = Object.fromEntries(Object.entries(exportPalettes).map(([id,p])=>[id,p.dark]));
export function workbookStyles(meta = {}) {
  const palette=Object.hasOwn(exportPalettes,meta.accent) ? exportPalettes[meta.accent] : exportPalettes.blue;
  const {dark,light,stripe,panel}=palette;
  const ink=palette.ink || dark;
  const {fontFamily,fontSize}=exportTypography(meta);
  const phases=exportPhasePalette(meta.accent);
  return exportStyles.map((s, i) => ({
    ...s,
    fontFamily, size:i===2 ? fontSize+5 : fontSize,
    ...(s.fill === "234F7C" ? { fill: dark, color:paletteTextColor(dark) } : {}),
    ...(i === 2 ? { color: ink } : {}),
    ...(i === 4 ? { fill: light } : {}),
    ...(i === 17 ? {fill:stripe} : {}),
    ...(i === 18 ? {color:ink} : {}),
    ...(i === 19 ? {fill:panel,color:ink} : {}),
    ...(meta.colorMode === "uniform" && i >= 7 && i <= 16 ? { fill: i % 2 ? dark : light, color:i%2 ? paletteTextColor(dark) : '24364B' } : {}),
    ...(meta.colorMode === "sections" && i >= 7 && i <= 16 ? (() => {
      const phase = phases[Math.floor((i-7)/2)];
      const fill = i % 2 ? phase.dark : phase.light;
      return {fill, color: paletteTextColor(fill)};
    })() : {}),
  }));
}
