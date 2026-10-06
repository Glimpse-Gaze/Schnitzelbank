// Fixed layers sit under the red title. Couplet cards are 800×400
// and fill the width two at a time. The blank parchment is 2800px tall.
const ROOT = "/Schnitzelbank_assembly";

export const BLANK = {
  src: `${ROOT}/Schnitzelbank_blank.png`,
  width: 1600,
  height: 2800,
};

export const MUSIC = {
  src: `${ROOT}/Schnitzelbank_music.png`,
  width: 1600,
  height: 400,
};

export const PANEL = {
  src: `${ROOT}/Schnitzelbank_panel.png`,
  width: 900,
  height: 400,
};

// Letter bodies of the red title end near y=332. Edge swashes reach
// y=400 but stay outside the staff, so the notes can sit just under
// the word. Ink offsets are the transparent padding in each export.
const TITLE_CLEAR = 364;
const MUSIC_INK_TOP = 56;
const MUSIC_INK_BOTTOM = 346;
const PANEL_SCALE = 1.2;
const PANEL_INK_TOP = 34;
const PANEL_GAP = 36;

export const CELL = { width: 800, height: 400 };
export const GRID = { columns: 2 };

export const COUPLETS = [
  {
    src: `${ROOT}/Couplets/Schnitzel_Kurz-Hier.png`,
    panels: [
      { id: "R1P1", label: "Kurz und lang" },
      { id: "R1P2", label: "Hin und her" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Kreuz_Schiess.png`,
    panels: [
      { id: "R1P3", label: "Kreuz und quer" },
      { id: "R1P4", label: "Schiess Gewehr" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Wagen-Krum.png`,
    panels: [
      { id: "R2P1", label: "Wagen Rad" },
      { id: "R2P2", label: "Krumm und Grad" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Grosses-Ochsen.png`,
    panels: [
      { id: "R2P3", label: "Grosses Glas" },
      { id: "R2P4", label: "Ochsen Blas" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Haufen-Schnickel.png`,
    panels: [
      { id: "R3P1", label: "Haufen Mist" },
      { id: "R3P2", label: "Schnickel Fritz" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Dicke-Fette.png`,
    panels: [
      { id: "R3P3", label: "Dicke Frau" },
      { id: "R3P4", label: "Fette Sau" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Langer-Tannen.png`,
    panels: [
      { id: "R4P1", label: "Langer Mann" },
      { id: "R4P2", label: "Tannenbaum" },
    ],
  },
  {
    src: `${ROOT}/Couplets/Schnitzel_Hochzeits-Gefahrliches.png`,
    panels: [
      { id: "R4P3", label: "Hochzeits Ring" },
      { id: "R4P4", label: "Gefährliches Ding" },
    ],
  },
];

export function shuffleCouplets(couplets = COUPLETS) {
  const next = [...couplets];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function layoutCouplets(couplets) {
  const musicY = TITLE_CLEAR - MUSIC_INK_TOP;
  const panelWidth = PANEL.width * PANEL_SCALE;
  const panelHeight = PANEL.height * PANEL_SCALE;
  const panelX = (BLANK.width - panelWidth) / 2;
  const panelY = musicY + MUSIC_INK_BOTTOM + PANEL_GAP - PANEL_INK_TOP * PANEL_SCALE;
  const gridY = panelY + panelHeight;
  const half = CELL.width / 2;
  const tiles = [];
  const panels = [
    {
      id: "R0P0",
      label: "Schnitzelbank",
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
  ];

  couplets.forEach((couplet, index) => {
    const column = index % GRID.columns;
    const row = Math.floor(index / GRID.columns);
    const x = column * CELL.width;
    const y = gridY + row * CELL.height;
    tiles.push({ src: couplet.src, x, y, width: CELL.width, height: CELL.height });
    couplet.panels.forEach((panel, side) => {
      panels.push({
        id: panel.id,
        label: panel.label,
        x: x + side * half,
        y,
        width: half,
        height: CELL.height,
      });
    });
  });

  const rows = Math.ceil(couplets.length / GRID.columns);
  const contentHeight = gridY + rows * CELL.height;
  return {
    width: BLANK.width,
    height: Math.max(BLANK.height, contentHeight),
    overflow: Math.max(0, contentHeight - BLANK.height),
    layers: [
      { src: BLANK.src, x: 0, y: 0, width: BLANK.width, height: BLANK.height },
      { src: MUSIC.src, x: 0, y: musicY, width: MUSIC.width, height: MUSIC.height },
      { src: PANEL.src, x: panelX, y: panelY, width: panelWidth, height: panelHeight },
      ...tiles,
    ],
    panels,
  };
}
