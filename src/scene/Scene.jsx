import { memo } from "react";
import { Canvas } from "@react-three/fiber";
import HoverOutline from "../components/HoverOutline.jsx";
import Board from "./Board.jsx";
import BoardCamera from "./BoardCamera.jsx";
import ZoomRig from "./ZoomRig.jsx";
import { applyCamera, cameraConfig } from "./cameraConfig.js";

const cameraProps = {
  position: cameraConfig.position,
  fov: cameraConfig.fov,
  near: cameraConfig.near,
  far: cameraConfig.far,
};

function Scene({
  hoveredPanel,
  cuedPanel,
  clickedPanel,
  showPointer,
  grade,
  gradeRef,
  onHoverPanel,
  onClickPanel,
}) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={cameraProps}
      onCreated={({ camera }) => applyCamera(camera)}
    >
      <color attach="background" args={["#2a2a2a"]} />
      <BoardCamera />
      <ZoomRig />
      <ambientLight intensity={0.95} />
      <directionalLight position={[4.5, 3.2, 1.4]} intensity={1.7} />
      <HoverOutline>
        <Board
          hoveredPanel={hoveredPanel}
          cuedPanel={cuedPanel}
          clickedPanel={clickedPanel}
          showPointer={showPointer}
          grade={grade}
          gradeRef={gradeRef}
          onHoverPanel={onHoverPanel}
          onClickPanel={onClickPanel}
        />
      </HoverOutline>
    </Canvas>
  );
}

export default memo(Scene);
