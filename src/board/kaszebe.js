const ROOT = "/Kaszebe_assembly/Couplets";

export const TEMPLATE = {
  src: "/Kaszebe_assembly/Kaszebe_template.png",
  width: 1600,
  height: 2800,
};

function card(id, file, width, height, hits) {
  return {
    id,
    src: encodeURI(`${ROOT}/${file}`),
    width,
    height,
    hits,
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
  ]),
  card("R1P2", "Base-Kaszeba.png", 700, 450, [
    hit("R1P2.1", 8, 4, 220, 322),
    hit("R1P2.2", 210, 48, 165, 265),
    hit("R1P2.3", 390, 4, 255, 320),
  ]),
  card("R2P1", "Ridel-Widłe.png", 700, 450, [
    hit("R2P1.1", 45, 4, 130, 312),
    hit("R2P1.2", 180, 4, 130, 312),
    hit("R2P1.3", 275, 8, 300, 302),
    hit("R2P1.4", 575, 8, 115, 308),
  ]),
  card("R2P2", "Proste-koło.png", 700, 450, [
    hit("R2P2.1", 58, 12, 85, 290),
    hit("R2P2.2", 175, 10, 155, 300),
    hit("R2P2.3", 348, 8, 310, 292),
  ]),
];

export const SQUARE_CARDS = [
  card("R3P1", "Hoczi.png", 450, 450, [
    hit("R3P1", 28, 14, 345, 305),
  ]),
  card("R3P2", "Ptoczi.png", 450, 450, [
    hit("R3P2", 16, 40, 420, 295),
  ]),
  card("R3P3", "Półtrojoczi.png", 450, 450, [
    hit("R3P3", 24, 2, 410, 300),
  ]),
  card("R4P1", "Kleka.png", 450, 450, [
    hit("R4P1", 4, 18, 442, 316),
  ]),
  card("R4P2", "Wół.png", 450, 450, [
    hit("R4P2", 48, 12, 340, 322),
  ]),
  card("R4P3", "Całe_pół.png", 450, 450, [
    hit("R4P3.1", 10, 14, 255, 268),
    hit("R4P3.2", 258, 18, 170, 262),
  ]),
];

const WIDE_SLOTS = [
  { x: 100, y: 377 },
  { x: 840, y: 377 },
  { x: 100, y: 862 },
  { x: 840, y: 862 },
];

const SQUARE_SLOTS = [
  { x: 100, y: 1378 },
  { x: 580, y: 1378 },
  { x: 1060, y: 1378 },
  { x: 100, y: 1872 },
  { x: 580, y: 1872 },
  { x: 1060, y: 1872 },
];

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

export function layoutKaszebe(wide, square) {
  const tiles = [];
  const panels = [];
  const place = (item, slot) => {
    tiles.push({
      src: item.src,
      x: slot.x,
      y: slot.y,
      width: item.width,
      height: item.height,
    });
    for (const area of item.hits) {
      panels.push({
        id: area.id,
        x: slot.x + area.x,
        y: slot.y + area.y,
        width: area.width,
        height: area.height,
      });
    }
  };
  wide.forEach((item, index) => place(item, WIDE_SLOTS[index]));
  square.forEach((item, index) => place(item, SQUARE_SLOTS[index]));
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
