import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frameAt, steps } from "../data/sequence.js";
import { songTime } from "../audio/useSong.js";
import { panelHit } from "./panelHits.js";

const box = new THREE.Box3();
const center = new THREE.Vector3();
const size = new THREE.Vector3();
const point = new THREE.Vector3();

export default function GradeFloat({ grade, labelRef }) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);

  useFrame(() => {
    const label = labelRef.current;
    if (!label) return;
    const mesh = grade ? panelHit(steps[grade.index]?.panel) : null;
    if (!grade || !mesh) {
      label.style.opacity = "0";
      return;
    }

    box.setFromObject(mesh);
    box.getCenter(center);
    box.getSize(size);
    const frame = frameAt(songTime());
    const scale = frame && frame.panel === steps[grade.index].panel ? frame.scale : 1;
    point.set(center.x + 0.03, center.y + (size.y * scale) / 2, center.z);
    point.project(camera);
    if (point.z > 1) {
      label.style.opacity = "0";
      return;
    }

    label.style.left = `${(point.x * 0.5 + 0.5) * viewport.width}px`;
    label.style.top = `${(-point.y * 0.5 + 0.5) * viewport.height}px`;
    label.style.opacity = "1";
  });

  return null;
}
