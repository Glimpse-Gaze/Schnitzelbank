const hits = new Map();

export function registerHit(name, mesh) {
  if (mesh) hits.set(name, mesh);
  else hits.delete(name);
}

export function panelHit(name) {
  return hits.get(name) ?? null;
}
