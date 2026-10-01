import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import HoverOutline from "../components/HoverOutline.jsx";
import Board from "./Board.jsx";
import BoardCamera from "./BoardCamera.jsx";
import { applyCamera, cameraConfig } from "./cameraConfig.js";

export default function Scene() {
  const [hoveredPanel, setHoveredPanel] = useState(null);

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{
        position: cameraConfig.position,
        fov: cameraConfig.fov,
        near: cameraConfig.near,
        far: cameraConfig.far,
      }}
      onCreated={({ camera }) => applyCamera(camera)}
    >
      <color attach="background" args={["#2a2a2a"]} />
      <BoardCamera />
      <ambientLight intensity={0.95} />
      <directionalLight position={[4.5, 3.2, 1.4]} intensity={1.7} />
      <HoverOutline>
        <Board hoveredPanel={hoveredPanel} onHoverPanel={setHoveredPanel} />
      </HoverOutline>
    </Canvas>
  );
}
