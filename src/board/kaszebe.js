const ROOT = "/Kaszebe_assembly/Couplets";

export const VERTICAL_TEMPLATE = {
  src: "/Kaszebe_assembly/Kaszebe_empty.png",
  width: 1600,
  height: 2800,
};

export const HORIZONTAL_TEMPLATE = {
  src: "/Kaszebe_assembly/Kaszebe_horizontal_empty.png",
  width: 1600,
  height: 1200,
};

// Prefer the landscape board when there is room for its 4:3 frame.
export const HORIZONTAL_QUERY = "(min-width: 920px)";

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

// Mobile / portrait: paired couplet cards, plus the final icon on its own tile.
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
    hit("R4P3", 16, 12, 400, 280),
  ], { left: 16, top: 30, right: 416, bottom: 304 }),
];

export const FINAL_CARD = card("R4P4", "Final_icon.png", 700, 450, [
  hit("R4P4", 20, 80, 660, 250),
], { left: 24, top: 86, right: 660, bottom: 340 });

// Browser / landscape: one file per picture, spaced along each staff.
export const HORIZONTAL_ROWS = [
  [
    card("R1P1a", "Krotcze.png", 350, 450, [
      hit("R1P1.1", 55, 70, 85, 240),
      hit("R1P1.2", 195, 10, 95, 300),
    ], { left: 55, top: 18, right: 290, bottom: 310 }),
    card("R1P1b", "Stoleca.png", 350, 450, [
      hit("R1P1.3", 10, 12, 330, 300),
    ], { left: 12, top: 14, right: 340, bottom: 310 }),
    card("R1P2a", "Base.png", 360, 450, [
      hit("R1P2.1", 4, 8, 175, 310),
      hit("R1P2.2", 170, 40, 170, 270),
    ], { left: 4, top: 8, right: 340, bottom: 318 }),
    card("R1P2b", "Kaszeba.png", 350, 450, [
      hit("R1P2.3", 40, 8, 250, 310),
    ], { left: 40, top: 8, right: 290, bottom: 318 }),
  ],
  [
    card("R2P1a", "Ridel.png", 350, 450, [
      hit("R2P1.1", 48, 8, 120, 300),
      hit("R2P1.2", 185, 8, 120, 300),
    ], { left: 50, top: 8, right: 315, bottom: 310 }),
    card("R2P1b", "Chojne.png", 400, 450, [
      hit("R2P1.3", 8, 10, 250, 300),
      hit("R2P1.4", 275, 10, 115, 300),
    ], { left: 8, top: 16, right: 390, bottom: 310 }),
    card("R2P2a", "Proste.png", 350, 450, [
      hit("R2P2.1", 50, 12, 80, 300),
      hit("R2P2.2", 165, 12, 160, 300),
    ], { left: 50, top: 20, right: 325, bottom: 318 }),
    card("R2P2b", "Koło.png", 350, 450, [
      hit("R2P2.3", 12, 10, 290, 300),
    ], { left: 12, top: 14, right: 305, bottom: 318 }),
  ],
  [
    card("R3P1", "Hoczi.png", 450, 450, [
      hit("R3P1", 28, 14, 345, 305),
    ], { left: 44, top: 28, right: 346, bottom: 302 }),
    card("R3P2", "Ptoczi.png", 450, 450, [
      hit("R3P2", 16, 40, 420, 295),
    ], { left: 28, top: 54, right: 424, bottom: 304 }),
    card("R3P3", "Półtrojoczi.png", 450, 450, [
      hit("R3P3", 24, 2, 410, 300),
    ], { left: 42, top: 4, right: 440, bottom: 304 }),
  ],
  [
    card("R4P1", "Kleka.png", 450, 450, [
      hit("R4P1", 4, 18, 442, 316),
    ], { left: 10, top: 36, right: 438, bottom: 304 }),
    card("R4P2", "Wół.png", 450, 450, [
      hit("R4P2", 48, 12, 340, 322),
    ], { left: 68, top: 24, right: 366, bottom: 304 }),
    card("R4P3", "Całe_pół.png", 450, 450, [
      hit("R4P3", 16, 12, 400, 280),
    ], { left: 16, top: 30, right: 416, bottom: 304 }),
    card("R4P4", "Final_icon.png", 700, 450, [
      hit("R4P4", 20, 80, 660, 250),
    ], { left: 24, top: 86, right: 660, bottom: 340 }),
  ],
];

// Two drawings that are clicked as one target. The id matches the sequence.
const DOUBLE_CLICKS = [
  ["R1P1.1", "R1P1.2"],
  ["R1P2.1", "R1P2.2"],
  ["R2P1.1", "R2P1.2"],
  ["R2P1.3", "R2P1.4"],
  ["R2P2.1", "R2P2.2"],
];

// Pictures that take a press-and-hold at some point in the song.
export const HOLD_FLOWERS = new Set([
  "R1P1.3",
  "R1P2.3",
  "R2P1.3+R2P1.4",
  "R2P2.3",
  "R3P3",
  "R4P4",
]);

const VERTICAL_CLEF = 216;
const VERTICAL_RIGHT = 1510;
// Staff midpoints on Kaszebe_empty.png (five staves; final sits alone on the last).
const VERTICAL_STAFF_Y = [537, 1022, 1539, 2033, 2552];

const HORIZONTAL_CLEF = 210;
const HORIZONTAL_RIGHT = 1500;
// Bottom line of each staff on the 1600×1200 empty board.
const HORIZONTAL_STAFF_BOTTOM = [405, 662, 910, 1120];
// Horizontal icon size (1 = native couplet pixels). Raise/lower to taste.
const HORIZONTAL_MAX_SCALE = 0.6;
// Last staff only — relative to HORIZONTAL_MAX_SCALE (0.9 ≈ 10% smaller).
const HORIZONTAL_ROW4_SCALE = HORIZONTAL_MAX_SCALE * 0.9;
// Row 3: ptôczi sits on the board center; side icons sit this many px from that center.
const HORIZONTAL_ROW3_SIDE_OFFSET = 400;
// Final icon alone on the mobile 5th staff (1 = native Final_icon.png size).
const VERTICAL_FINAL_SCALE = 1.12;

function mix(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function linearKaszebe() {
  return {
    wide: [...WIDE_CARDS],
    square: [...SQUARE_CARDS],
    final: FINAL_CARD,
    rows: HORIZONTAL_ROWS.map((row) => [...row]),
  };
}

export function shuffleKaszebe(current) {
  const wideSource = current?.wide ?? WIDE_CARDS;
  const squareSource = current?.square ?? SQUARE_CARDS;
  const rowSource = current?.rows ?? HORIZONTAL_ROWS;
  const wide = mix(wideSource);
  const square = mix(squareSource);
  if (wide.every((item, index) => item.id === wideSource[index].id)) wide.push(wide.shift());
  if (square.every((item, index) => item.id === squareSource[index].id)) square.push(square.shift());
  const rows = rowSource.map((row) => {
    const next = mix(row);
    if (next.every((item, index) => item.id === row[index].id)) next.push(next.shift());
    return next;
  });
  return {
    wide,
    square,
    final: current?.final ?? FINAL_CARD,
    rows,
  };
}

function weightOf(item) {
  if (item.id === "R4P1") return 0.9;
  if (item.id === "R4P2") return 0.94;
  if (item.id === "R4P3") return 0.95;
  // Final spheres: +10% vs prior size even when row 4 is scaled down.
  if (item.id === "R4P4") return 1.00;
  return 1;
}

function packCenteredTrio(cards, staffBottom, sideOffset, maxScale) {
  const midX = HORIZONTAL_TEMPLATE.width / 2;
  return cards.map((item, index) => {
    const scale = weightOf(item) * maxScale;
    const inkMid = (item.ink.left + item.ink.right) / 2;
    const centerX = index === 1
      ? midX
      : index === 0
        ? midX - sideOffset
        : midX + sideOffset;
    return {
      item,
      x: centerX - inkMid * scale,
      y: staffBottom - item.ink.bottom * scale,
      scale,
    };
  });
}

function packRow(cards, staffY, targetGap, clef, staffRight, maxFactor, align = "mid") {
  const room = staffRight - clef;
  const gaps = Math.max(0, cards.length - 1);
  const ink = cards.map((item) => (item.ink.right - item.ink.left) * weightOf(item));
  const sum = ink.reduce((total, width) => total + width, 0);
  const wanted = gaps ? (room - targetGap * gaps) / sum : room / Math.max(sum, 1);
  const floor = align === "bottom" ? 0.28 : 0.55;
  const factor = Math.min(maxFactor, Math.max(floor, wanted));
  const scales = cards.map((item) => weightOf(item) * factor);
  const widths = cards.map((item, index) => (item.ink.right - item.ink.left) * scales[index]);
  const used = widths.reduce((total, width) => total + width, 0);
  const gap = gaps ? (room - used) / gaps : 0;
  let cursor = clef;
  return cards.map((item, index) => {
    const scale = scales[index];
    const x = cursor - item.ink.left * scale;
    const y = align === "bottom"
      ? staffY - item.ink.bottom * scale
      : staffY - ((item.ink.top + item.ink.bottom) / 2) * scale;
    cursor += widths[index] + gap;
    return { item, x, y, scale };
  });
}

function placeCards(placements, tiles, panels) {
  for (const { item, x, y, scale } of placements) {
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
  }
}

function layoutVertical(wide, square, final) {
  const tiles = [];
  const panels = [];
  const pack = (cards, staffY, gap) =>
    packRow(cards, staffY, gap, VERTICAL_CLEF, VERTICAL_RIGHT, 1.02, "mid");
  placeCards(pack(wide.slice(0, 2), VERTICAL_STAFF_Y[0], 100), tiles, panels);
  placeCards(pack(wide.slice(2, 4), VERTICAL_STAFF_Y[1], 100), tiles, panels);
  placeCards(pack(square.slice(0, 3), VERTICAL_STAFF_Y[2], 80), tiles, panels);
  placeCards(pack(square.slice(3, 6), VERTICAL_STAFF_Y[3], 80), tiles, panels);
  const finale = packRow(
    [final ?? FINAL_CARD],
    VERTICAL_STAFF_Y[4],
    0,
    VERTICAL_CLEF,
    VERTICAL_RIGHT,
    VERTICAL_FINAL_SCALE,
    "mid",
  );
  const finaleItem = finale[0];
  const inkLeft = finaleItem.x + finaleItem.item.ink.left * finaleItem.scale;
  const inkRight = finaleItem.x + finaleItem.item.ink.right * finaleItem.scale;
  const shift = (VERTICAL_CLEF + VERTICAL_RIGHT) / 2 - (inkLeft + inkRight) / 2;
  placeCards([{ ...finaleItem, x: finaleItem.x + shift }], tiles, panels);
  return {
    orientation: "vertical",
    width: VERTICAL_TEMPLATE.width,
    height: VERTICAL_TEMPLATE.height,
    layers: [
      {
        src: VERTICAL_TEMPLATE.src,
        x: 0,
        y: 0,
        width: VERTICAL_TEMPLATE.width,
        height: VERTICAL_TEMPLATE.height,
      },
      ...tiles,
    ],
    panels,
  };
}

function layoutHorizontal(rows) {
  const tiles = [];
  const panels = [];
  const pack = (cards, staffBottom, gap) =>
    packRow(
      cards,
      staffBottom,
      gap,
      HORIZONTAL_CLEF,
      HORIZONTAL_RIGHT,
      HORIZONTAL_MAX_SCALE,
      "bottom",
    );
  const source = rows ?? HORIZONTAL_ROWS;
  placeCards(pack(source[0], HORIZONTAL_STAFF_BOTTOM[0], 110), tiles, panels);
  placeCards(pack(source[1], HORIZONTAL_STAFF_BOTTOM[1], 110), tiles, panels);
  placeCards(
    packCenteredTrio(
      source[2],
      HORIZONTAL_STAFF_BOTTOM[2],
      HORIZONTAL_ROW3_SIDE_OFFSET,
      HORIZONTAL_MAX_SCALE,
    ),
    tiles,
    panels,
  );
  placeCards(
    packRow(
      source[3],
      HORIZONTAL_STAFF_BOTTOM[3],
      90,
      HORIZONTAL_CLEF,
      HORIZONTAL_RIGHT,
      HORIZONTAL_ROW4_SCALE,
      "bottom",
    ),
    tiles,
    panels,
  );
  return {
    orientation: "horizontal",
    width: HORIZONTAL_TEMPLATE.width,
    height: HORIZONTAL_TEMPLATE.height,
    layers: [
      {
        src: HORIZONTAL_TEMPLATE.src,
        x: 0,
        y: 0,
        width: HORIZONTAL_TEMPLATE.width,
        height: HORIZONTAL_TEMPLATE.height,
      },
      ...tiles,
    ],
    panels,
  };
}

export function layoutKaszebe(cards, orientation = "vertical") {
  if (orientation === "horizontal") return layoutHorizontal(cards?.rows);
  return layoutVertical(
    cards?.wide ?? WIDE_CARDS,
    cards?.square ?? SQUARE_CARDS,
    cards?.final ?? FINAL_CARD,
  );
}
