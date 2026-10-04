import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraConfig } from "./cameraConfig.js";
import { setPointerDragged } from "./pointerDrag.js";
import { bindZoom } from "./zoomBus.js";

const target = new THREE.Vector3(...cameraConfig.target);
const homeTarget = target.clone();

const DRAG_THRESHOLD = 5;

function setDistance(camera, distance) {
  const next = THREE.MathUtils.clamp(distance, cameraConfig.minDistance, cameraConfig.maxDistance);
  camera.position.set(target.x + next, target.y, target.z);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function panByPixels(camera, element, dx, dy) {
  const distance = Math.max(camera.position.x - target.x, cameraConfig.minDistance);
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * distance;
  const scale = visibleHeight / element.clientHeight;

  // Screen right is -Z and screen up is +Y. The drag grabs the board.
  // X stays put, so the camera cannot turn or dolly.
  target.y = THREE.MathUtils.clamp(
    target.y + dy * scale,
    homeTarget.y - cameraConfig.panLimit.y,
    homeTarget.y + cameraConfig.panLimit.y,
  );
  target.z = THREE.MathUtils.clamp(
    target.z + dx * scale,
    homeTarget.z - cameraConfig.panLimit.z,
    homeTarget.z + cameraConfig.panLimit.z,
  );
  target.x = homeTarget.x;
  camera.position.set(target.x + distance, target.y, target.z);
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
