import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function size(file) {
  const buf = readFileSync(file);
  console.log(`${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}  ${file}`);
}

const root = "public/Schnitzelbank_assembly";
for (const name of readdirSync(root)) {
  const path = join(root, name);
  if (name.endsWith(".png")) size(path);
}
for (const name of readdirSync(join(root, "Couplets"))) {
  size(join(root, "Couplets", name));
}
