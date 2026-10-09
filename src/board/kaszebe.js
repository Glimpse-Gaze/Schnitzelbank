const ROOT = "/Kaszebe_assembly/Couplets";

export const TEMPLATE = {
  src: "/Kaszebe_assembly/Kaszebe_template.png",
  width: 1600,
  height: 2800,
};

function card(id, file, width, height, hits, ink) {
  return {
    id,
    src: encodeURI(`${ROOT}/${file}`),
    width,
    height,
    hits,
    ink,
  };
}

function hit(id, x, y, width, height) {
  return { id, x, y, width, height };
}

// Wide cards stay on the first two staffs. Square cards stay on the next two.
// Hits cover the drawings. The painted captions sit below these boxes.
export const WIDE_CARDS = [
  card("R1P1", "Krotcze-Stoleca.png", 700, 450, [
    hit("R1P1.1", 64, 80, 80, 230),
    hit("R1P1.2", 200, 12, 90, 300),
    hit("R1P1.3", 340, 10, 345, 305),
  ], { left: 76, top: 16, right: 678, bottom: 304 }),
  card("R1P2", "Base-Kaszeba.png", 700, 450, [
    hit("R1P2.1", 8, 4, 220, 322),
    hit("R1P2.2", 210, 48, 165, 265),
    hit("R1P2.3", 390, 4, 255, 320),
  ], { left: 20, top: 6, right: 634, bottom: 304 }),
  card("R2P1", "Ridel-Widłe.png", 700, 450, [
    hit("R2P1.1", 48, 8, 114, 292),
    hit("R2P1.2", 188, 8, 82, 292),
    hit("R2P1.3", 298, 8, 268, 292),
    hit("R2P1.4", 586, 8, 82, 292),
  ], { left: 56, top: 6, right: 666, bottom: 304 }),
  card("R2P2", "Proste-koło.png", 700, 450, [
    hit("R2P2.1", 58, 12, 85, 290),
    hit("R2P2.2", 175, 10, 155, 300),
    hit("R2P2.3", 348, 8, 310, 292),
  ], { left: 76, top: 16, right: 646, bottom: 304 }),
];

export const SQUARE_CARDS = [
  card("R3P1", "Hoczi.png", 450, 450, [
    hit("R3P1", 28, 14, 345, 305),
  ], { left: 44, top: 28, right: 346, bottom: 302 }),
  card("R3P2", "Ptoczi.png", 450, 450, [
    hit("R3P2", 16, 40, 420, 295),
  ], { left: 28, top: 54, right: 424, bottom: 304 }),
  card("R3P3", "Półtrojoczi.png", 450, 450, [
    hit("R3P3", 24, 2, 410, 300),
  ], { left: 42, top: 4, right: 440, bottom: 304 }),
  card("R4P1", "Kleka.png", 450, 450, [
    hit("R4P1", 4, 18, 442, 316),
  ], { left: 10, top: 36, right: 438, bottom: 304 }),
  card("R4P2", "Wół.png", 450, 450, [
    hit("R4P2", 48, 12, 340, 322),
  ], { left: 68, top: 24, right: 366, bottom: 304 }),
  card("R4P3", "Całe_pół.png", 450, 450, [
    hit("R4P3", 10, 14, 418, 268),
  ], { left: 16, top: 30, right: 416, bottom: 304 }),
];

// Two drawings that are clicked as one target. The id matches the sequence.
const DOUBLE_CLICKS = [
  ["R1P1.1", "R1P1.2"],
  ["R1P2.1", "R1P2.2"],
  ["R2P1.1", "R2P1.2"],
  ["R2P1.3", "R2P1.4"],
  ["R2P2.1", "R2P2.2"],
];

// Staff bands, measured from the template. Drawings start to the right of the clef.
const CLEF = 216;
const STAFF_RIGHT = 1510;
const STAFF_Y = [537, 1022, 1539, 2033];

function mix(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function linearKaszebe() {
  return { wide: [...WIDE_CARDS], square: [...SQUARE_CARDS] };
}

export function shuffleKaszebe(current) {
  const wideSource = current?.wide ?? WIDE_CARDS;
  const squareSource = current?.square ?? SQUARE_CARDS;
  const wide = mix(wideSource);
  const square = mix(squareSource);
  if (wide.every((item, index) => item.id === wideSource[index].id)) wide.push(wide.shift());
  if (square.every((item, index) => item.id === squareSource[index].id)) square.push(square.shift());
  return { wide, square };
}

function weightOf(item) {
  if (item.id === "R4P1") return 0.9;
  if (item.id === "R4P2") return 0.94;
  return 1;
}

// Grow the row until the gaps are about `targetGap`, then share any remainder.
// A cap keeps captions from meeting the next staff.
function packRow(cards, staffY, targetGap) {
  const room = STAFF_RIGHT - CLEF;
  const gaps = Math.max(0, cards.length - 1);
  const ink = cards.map((item) => (item.ink.right - item.ink.left) * weightOf(item));
  const sum = ink.reduce((total, width) => total + width, 0);
  const maxFactor = 1.02;
  const wanted = gaps ? (room - targetGap * gaps) / sum : 1;
  const factor = Math.min(maxFactor, Math.max(0.75, wanted));
  const scales = cards.map((item) => weightOf(item) * factor);
  const widths = cards.map((item, index) => (item.ink.right - item.ink.left) * scales[index]);
  const used = widths.reduce((total, width) => total + width, 0);
  const gap = gaps ? (room - used) / gaps : 0;
  let cursor = CLEF;
  return cards.map((item, index) => {
    const scale = scales[index];
    const x = cursor - item.ink.left * scale;
    const mid = (item.ink.top + item.ink.bottom) / 2;
    const y = staffY - mid * scale;
    cursor += widths[index] + gap;
    return { item, x, y, scale };
  });
}

export function layoutKaszebe(wide, square) {
  const tiles = [];
  const panels = [];
  const place = ({ item, x, y, scale }) => {
    tiles.push({
      src: item.src,
      x,
      y,
      width: item.width * scale,
      height: item.height * scale,
    });
    const hits = item.hits;
    for (let index = 0; index < hits.length; index += 1) {
      const area = hits[index];
      const partner = hits[index + 1];
      const pair = partner && DOUBLE_CLICKS.find((ids) => ids[0] === area.id && ids[1] === partner.id);
      const areas = pair ? [area, partner] : [area];
      if (pair) index += 1;
      const left = Math.min(...areas.map((hitBox) => hitBox.x));
      const top = Math.min(...areas.map((hitBox) => hitBox.y));
      const right = Math.max(...areas.map((hitBox) => hitBox.x + hitBox.width));
      const bottom = Math.max(...areas.map((hitBox) => hitBox.y + hitBox.height));
      panels.push({
        id: pair ? pair.join("+") : area.id,
        x: x + left * scale,
        y: y + top * scale,
        width: (right - left) * scale,
        height: (bottom - top) * scale,
      });
    }
  };
  packRow(wide.slice(0, 2), STAFF_Y[0], 100).forEach(place);
  packRow(wide.slice(2, 4), STAFF_Y[1], 100).forEach(place);
  packRow(square.slice(0, 3), STAFF_Y[2], 80).forEach(place);
  packRow(square.slice(3, 6), STAFF_Y[3], 80).forEach(place);
  return {
    width: TEMPLATE.width,
    height: TEMPLATE.height,
    layers: [
      { src: TEMPLATE.src, x: 0, y: 0, width: TEMPLATE.width, height: TEMPLATE.height },
      ...tiles,
    ],
    panels,
  };
}
