let dragged = false;

export function setPointerDragged(value) {
  dragged = value;
}

export function pointerDragged() {
  return dragged;
}
