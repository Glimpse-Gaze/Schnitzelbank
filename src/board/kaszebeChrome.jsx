// Kashubian frame chrome. Solid corner brackets mark every panel. The painted bar sits only on a hold.

const NAVY = "#1a4e8c";
const SKY = "#9fd0ee";

const BAR_SRC = "/Kaszebe_assembly/Progress_bar.png";
const BAR_W = 420;
const BAR_H = 100;

function cornerBracket(x, y, dx, dy, arm, thick) {
  const ox = x - dx * thick;
  const oy = y - dy * thick;
  const farX = ox + dx * (arm + thick);
  const farY = oy + dy * (arm + thick);
  const innerX = ox + dx * thick;
  const innerY = oy + dy * thick;
  return `M ${ox} ${oy} L ${farX} ${oy} L ${farX} ${innerY} L ${innerX} ${innerY} L ${innerX} ${farY} L ${ox} ${farY} Z`;
}

export function PanelChrome({ panel }) {
  const { x, y, width, height } = panel;
  const arm = Math.min(40, width * 0.2, height * 0.2);
  const thick = Math.min(6, Math.max(8, arm * 0.36));
  const right = x + width;
  const bottom = y + height;
  const path = [
    cornerBracket(x, y, 1, 1, arm, thick),
    cornerBracket(right, y, -1, 1, arm, thick),
    cornerBracket(x, bottom, 1, -1, arm, thick),
    cornerBracket(right, bottom, -1, -1, arm, thick),
  ].join(" ");
  return (
    <g pointerEvents="none">
      <path d={path} fill={SKY} />
    </g>
  );
}

export function ApproachFrame({ chromeId, frameIndex, panel, scale, opacity, arrived }) {
  const travel = Math.min(1, Math.max(0, arrived));
  const revealT = Math.min(1, travel / 0.7);
  const reveal = revealT * revealT * (3 - 2 * revealT);
  const alpha = opacity * (0.28 + 0.72 * reveal);
  if (alpha < 0.02) return null;
  const blur = travel < 0.32 ? (1 - travel / 0.32) * 22 : 0;
  const width = panel.width * scale;
  const height = panel.height * scale;
  const x = panel.x + panel.width / 2 - width / 2;
  const y = panel.y + panel.height / 2 - height / 2;
  const filterId = `${chromeId}-soft-${frameIndex}`;
  const thread = (
    <rect x={x} y={y} width={width} height={height} fill="none" stroke={NAVY} strokeWidth="18" />
  );
  return (
    <g pointerEvents="none" opacity={alpha}>
      {blur > 0.4 ? (
        <defs>
          <filter id={filterId} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        </defs>
      ) : null}
      {blur > 0.4 ? <g filter={`url(#${filterId})`}>{thread}</g> : thread}
    </g>
  );
}

export function FolkHoldBar({ chromeId, bounds, progress }) {
  if (!bounds || !Number.isFinite(bounds.width) || bounds.width < 36) return null;
  const barH = Math.min(168, Math.max(108, bounds.width * 0.36));
  const barW = barH * (BAR_W / BAR_H);
  const x = bounds.x + bounds.width / 2 - barW / 2;
  const y = bounds.y - barH - 8;
  const amount = Math.min(1, Math.max(0, progress));
  const slotX = x + barW * 0.2;
  const slotW = barW * 0.6;
  const slotY = y + barH * 0.47;
  const slotH = barH * 0.14;
  const clipId = `${chromeId}-hold-clip`;
  return (
    <g pointerEvents="none">
      <rect x={slotX} y={slotY} width={slotW} height={slotH} rx={slotH / 2} fill="#f4efe2" />
      {amount > 0.004 ? (
        <rect x={slotX} y={slotY} width={slotW * amount} height={slotH} rx={slotH / 2} fill={NAVY} />
      ) : null}
      <clipPath id={clipId}>
        <rect x={x} y={y} width={barW} height={barH} />
      </clipPath>
      <image href={BAR_SRC} x={x} y={y} width={barW} height={barH} clipPath={`url(#${clipId})`} />
    </g>
  );
}
