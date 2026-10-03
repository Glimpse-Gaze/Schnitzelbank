import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraConfig } from "./cameraConfig.js";
import { setPointerDragged } from "./pointerDrag.js";
import { bindZoom } from "./zoomBus.js";

const target = new THREE.Vector3(...cameraConfig.target);
const homeTarget = target.clone();
const offset = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const shift = new THREE.Vector3();
const previousTarget = new THREE.Vector3();

const DRAG_THRESHOLD = 5;

function setDistance(camera, distance) {
  offset.copy(camera.position).sub(target);
  const length = offset.length();
  if (length < 1e-4) return;
  const next = THREE.MathUtils.clamp(distance, cameraConfig.minDistance, cameraConfig.maxDistance);
  offset.multiplyScalar(next / length);
  camera.position.copy(target).add(offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function panByPixels(camera, element, dx, dy) {
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const distance = camera.position.distanceTo(target);
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * distance;
  const scale = visibleHeight / element.clientHeight;

  // Dragging grabs the board: the camera steps the opposite way, and only sideways or up.
  shift.copy(right).multiplyScalar(-dx * scale).addScaledVector(up, dy * scale);
  shift.x = 0;

  previousTarget.copy(target);
  target.add(shift);
  target.x = homeTarget.x;
  target.y = THREE.MathUtils.clamp(
    target.y,
    homeTarget.y - cameraConfig.panLimit.y,
    homeTarget.y + cameraConfig.panLimit.y,
  );
  target.z = THREE.MathUtils.clamp(
    target.z,
    homeTarget.z - cameraConfig.panLimit.z,
    homeTarget.z + cameraConfig.panLimit.z,
  );
  camera.position.add(shift.copy(target).sub(previousTarget));
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
}

export default function ZoomRig() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const element = gl.domElement;
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;
    let panning = false;

    const dolly = (delta) => {
      const distance = camera.position.distanceTo(target);
      setDistance(camera, distance * (1 + delta));
    };

    const onWheel = (event) => {
      event.preventDefault();
      dolly(event.deltaY * 0.001);
    };

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      panning = false;
      setPointerDragged(false);
      element.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (!panning) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        panning = true;
        setPointerDragged(true);
        element.classList.add("is-panning");
      }
      lastX = event.clientX;
      lastY = event.clientY;
      if (dx !== 0 || dy !== 0) panByPixels(camera, element, dx, dy);
    };

    const endPointer = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      panning = false;
      element.classList.remove("is-panning");
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };

    const unbind = bindZoom((direction) => dolly(direction * 0.18));
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", endPointer);
    element.addEventListener("pointercancel", endPointer);
    return () => {
      unbind();
      element.classList.remove("is-panning");
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endPointer);
      element.removeEventListener("pointercancel", endPointer);
    };
  }, [camera, gl]);

  return null;
}
