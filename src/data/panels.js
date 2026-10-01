// Blender names interactive regions Row{n}_Panel{n}. The poster stays visual-only.
export const PANEL_NAME = /^Row\d+_Panel\d+$/;

export function isPanelName(name) {
  return PANEL_NAME.test(name ?? "");
}
