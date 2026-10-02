import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraConfig } from "./cameraConfig.js";
import { bindZoom } from "./zoomBus.js";

const target = new THREE.Vector3(...cameraConfig.target);
const offset = new THREE.Vector3();

function setDistance(camera, distance) {
  offset.copy(camera.position).sub(target);
  const length = offset.length();
  if (length < 1e-4) return;
  const next = THREE.MathUtils.clamp(distance, cameraConfig.minDistance, cameraConfig.maxDistance);
  offset.multiplyScalar(next / length);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

export default function ZoomRig() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const dolly = (delta) => {
      const distance = camera.position.distanceTo(target);
      setDistance(camera, distance * (1 + delta));
    };

    const onWheel = (event) => {
      event.preventDefault();
      dolly(event.deltaY * 0.001);
    };

    const unbind = bindZoom((direction) => dolly(direction * 0.18));
    gl.domElement.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      unbind();
      gl.domElement.removeEventListener("wheel", onWheel);
    };
  }, [camera, gl]);

  return null;
}
