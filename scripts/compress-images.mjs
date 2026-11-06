/**
 * Moves PNG originals out of public/ into originals/, then writes WebP
 * copies back into public/ for the paths the app actually loads.
 *
 * Run: node scripts/compress-images.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const originalsDir = path.join(root, "originals");

/** Live assets referenced by the app (relative to public/). */
const LIVE = [
  "Kaszebe_assembly/Kaszebe_empty.png",
  "Kaszebe_assembly/Kaszebe_horizontal_empty.png",
  "Kaszebe_assembly/Floral_pattern.png",
  "Kaszebe_assembly/Progress_bar.png",
  "Kaszebe_assembly/Couplets/Krotcze-Stoleca.png",
  "Kaszebe_assembly/Couplets/Base-Kaszeba.png",
  "Kaszebe_assembly/Couplets/Ridel-Widłe.png",
  "Kaszebe_assembly/Couplets/Proste-koło.png",
  "Kaszebe_assembly/Couplets/Hoczi.png",
  "Kaszebe_assembly/Couplets/Ptoczi.png",
  "Kaszebe_assembly/Couplets/Półtrojoczi.png",
  "Kaszebe_assembly/Couplets/Kleka.png",
  "Kaszebe_assembly/Couplets/Wół.png",
  "Kaszebe_assembly/Couplets/Całe_pół.png",
  "Kaszebe_assembly/Couplets/Final_icon.png",
  "Kaszebe_assembly/Couplets/Krotcze.png",
  "Kaszebe_assembly/Couplets/Stoleca.png",
  "Kaszebe_assembly/Couplets/Base.png",
  "Kaszebe_assembly/Couplets/Kaszeba.png",
  "Kaszebe_assembly/Couplets/Ridel.png",
  "Kaszebe_assembly/Couplets/Chojne.png",
  "Kaszebe_assembly/Couplets/Proste.png",
  "Kaszebe_assembly/Couplets/Koło.png",
  "Schnitzelbank_assembly/Schnitzelbank_blank.png",
  "Schnitzelbank_assembly/Schnitzelbank_panel.png",
  "Schnitzelbank_assembly/Music/Schnitzelbank_music_only_staff.png",
  "Schnitzelbank_assembly/Music/Schnitzelbank_music_only_notes.png",
  "Schnitzelbank_assembly/Music/Schnitzelbank_music_lyrics.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Kurz-Hier.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Kreuz_Schiess.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Wagen-Krum.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Grosses-Ochsen.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Haufen-Schnickel.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Dicke-Fette.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Langer-Tannen.png",
  "Schnitzelbank_assembly/Couplets/Schnitzel_Hochzeits-Gefahrliches.png",
  "Swap.png",
  "time-left.png",
  "Pointing.png",
];

const RESIZE = {
  "Pointing.png": 1024,
  "Swap.png": 256,
  "time-left.png": 256,
};

async function walkPngs(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkPngs(full, base)));
    } else if (/\.png$/i.test(entry.name)) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function copyOriginal(rel) {
  const from = path.join(publicDir, rel);
  const to = path.join(originalsDir, rel);
  try {
    await fs.access(to);
    return; // already archived
  } catch {
    // continue
  }
  await ensureDir(to);
  await fs.copyFile(from, to);
}

async function compressLive(rel) {
  const srcPng = path.join(publicDir, rel);
  const archived = path.join(originalsDir, rel);
  const webpRel = rel.replace(/\.png$/i, ".webp");
  const dest = path.join(publicDir, webpRel);

  const source = await fs
    .access(archived)
    .then(() => archived)
    .catch(() => srcPng);

  let pipeline = sharp(source);
  const maxEdge = RESIZE[rel];
  if (maxEdge) {
    pipeline = pipeline.resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const buf = await pipeline
    .webp({ quality: 82, alphaQuality: 85, effort: 6 })
    .toBuffer();
  await ensureDir(dest);
  await fs.writeFile(dest, buf);

  // Drop the live PNG so deploys don't ship both.
  try {
    await fs.unlink(srcPng);
  } catch {
    // already gone
  }

  const before = (await fs.stat(source)).size;
  console.log(
    `${rel} → ${webpRel}  ${(before / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB`,
  );
}

async function archiveUnused(rel) {
  const from = path.join(publicDir, rel);
  await copyOriginal(rel);
  try {
    await fs.unlink(from);
    console.log(`archived unused ${rel}`);
  } catch {
    // gone
  }
}

async function main() {
  const all = await walkPngs(publicDir);
  const liveSet = new Set(LIVE);

  for (const rel of all) {
    await copyOriginal(rel);
  }

  for (const rel of LIVE) {
    const archived = path.join(originalsDir, rel);
    const live = path.join(publicDir, rel);
    const hasArchived = await fs.access(archived).then(() => true).catch(() => false);
    const hasLive = await fs.access(live).then(() => true).catch(() => false);
    if (!hasArchived && !hasLive) {
      console.warn(`missing ${rel}`);
      continue;
    }
    await compressLive(rel);
  }

  for (const rel of all) {
    if (!liveSet.has(rel)) {
      await archiveUnused(rel);
    }
  }

  console.log("Done. Originals in ./originals, live WebP in ./public");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
