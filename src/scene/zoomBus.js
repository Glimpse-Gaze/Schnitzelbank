let zoomHandler = null;

export function bindZoom(handler) {
  zoomHandler = handler;
  return () => {
    if (zoomHandler === handler) zoomHandler = null;
  };
}

export function requestZoom(direction) {
  zoomHandler?.(direction);
}
