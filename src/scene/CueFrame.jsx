import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { frameAt } from "../data/sequence.js";
import { songTime } from "../audio/useSong.js";
import { panelHit } from "./panelHits.js";

const box = new THREE.Box3();
const center = new THREE.Vector3();
const size = new THREE.Vector3();

const FACE = [0, Math.PI / 2, 0];
const THICK = 0.02;

function placeBar(mesh, x, y, z, width, height) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(FACE[0], FACE[1], FACE[2]);
  mesh.scale.set(width, height, 1);
  mesh.visible = true;
}

function layout(bars, spanZ, spanY, x, y, z) {
  const halfZ = spanZ / 2;
  const halfY = spanY / 2;
  placeBar(bars[0], x, y + halfY, z, spanZ + THICK, THICK);
  placeBar(bars[1], x, y - halfY, z, spanZ + THICK, THICK);
  placeBar(bars[2], x, y, z + halfZ, THICK, spanY);
  placeBar(bars[3], x, y, z - halfZ, THICK, spanY);
}

export default function CueFrame() {
  const targetBars = useRef([]);
  const movingBars = useRef([]);
  const targetMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ff4b00",
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const movingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ff4b00",
        transparent: true,
        opacity: 1,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useLayoutEffect(
    () => () => {
      targetMaterial.dispose();
      movingMaterial.dispose();
    },
    [targetMaterial, movingMaterial],
  );

  useFrame(() => {
    const frame = frameAt(songTime());
    const mesh = frame ? panelHit(frame.panel) : null;
    const ready = targetBars.current.length === 4 && movingBars.current.every(Boolean);
    const show = Boolean(ready && frame && mesh && frame.opacity > 0.02);
    for (const bar of [...targetBars.current, ...movingBars.current]) {
      if (bar) bar.visible = show;
    }
    if (!show) return;

    box.setFromObject(mesh);
    box.getCenter(center);
    box.getSize(size);
    const x = center.x + 0.02;
    const spanZ = Math.max(size.z, 0.05);
    const spanY = Math.max(size.y, 0.05);
    targetMaterial.opacity = frame.opacity * 0.45;
    movingMaterial.opacity = frame.opacity;
    layout(targetBars.current, spanZ, spanY, x, center.y, center.z);
    layout(movingBars.current, spanZ * frame.scale, spanY * frame.scale, x, center.y, center.z);
  });

  const bars = (listRef, material) =>
    [0, 1, 2, 3].map((index) => (
      <mesh
        key={index}
        ref={(node) => {
          listRef.current[index] = node;
        }}
        visible={false}
        raycast={() => null}
        renderOrder={4}
        material={material}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
    ));

  return (
    <group>
      {bars(targetBars, targetMaterial)}
      {bars(movingBars, movingMaterial)}
    </group>
  );
}
