/*
Visual meshes come from Schnitzelbank_test2.glb.
Row*_Panel* meshes stay invisible and take the pointer.
Their Blender translation and scale are kept, so each row sits on its own band.
*/

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useGraph, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HoverSelect } from "../components/HoverOutline.jsx";
import { isPanelName } from "../data/panels.js";
import { pointerDragged } from "./pointerDrag.js";
import { registerHit } from "./panelHits.js";
import CueFrame from "./CueFrame.jsx";
import GradeFloat from "./GradeFloat.jsx";
import PointingHand from "./PointingHand.jsx";

const PANEL_OFFSET = 0.008;

function nodeProps(node, xOffset = 0) {
  return {
    position: [node.position.x + xOffset, node.position.y, node.position.z],
    quaternion: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w],
    scale: [node.scale.x, node.scale.y, node.scale.z],
  };
}

function PanelHit({ node, hovered, cued, clicked, showPointer, onHoverPanel, onClickPanel }) {
  const hit = useRef(null);
  const transform = nodeProps(node, PANEL_OFFSET);

  useLayoutEffect(() => {
    registerHit(node.name, hit.current);
    return () => registerHit(node.name, null);
  }, [node.name]);

  return (
    <group>
      <HoverSelect enabled={hovered}>
        <mesh
          ref={hit}
          name={node.name}
          geometry={node.geometry}
          {...transform}
          onPointerOver={(event) => {
            event.stopPropagation();
            onHoverPanel(node.name);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            onHoverPanel((current) => (current === node.name ? null : current));
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (pointerDragged()) return;
            onClickPanel(node.name);
          }}
        >
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </HoverSelect>
      {clicked ? (
        <mesh geometry={node.geometry} {...transform} raycast={() => null} renderOrder={3}>
          <meshBasicMaterial
            color="#ff4b00"
            transparent
            opacity={0.34}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {cued && showPointer ? <PointingHand target={hit} /> : null}
    </group>
  );
}

export function Model({
  hoveredPanel = null,
  cuedPanel = null,
  clickedPanel = null,
  showPointer = false,
  grade = null,
  gradeRef = null,
  onHoverPanel = () => {},
  onClickPanel = () => {},
  ...props
}) {
  const { scene } = useGLTF("/Schnitzelbank_test2.glb");
  const { nodes } = useGraph(scene);
  const gl = useThree((state) => state.gl);
  const visuals = useMemo(
    () => Object.values(nodes).filter((node) => node.isMesh && !isPanelName(node.name)),
    [nodes],
  );
  const panels = useMemo(
    () => Object.values(nodes).filter((node) => node.isMesh && isPanelName(node.name)),
    [nodes],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const previous = canvas.style.cursor;
    canvas.style.cursor = hoveredPanel ? "pointer" : "";
    return () => {
      canvas.style.cursor = previous;
    };
  }, [gl, hoveredPanel]);

  return (
    <group {...props} dispose={null}>
      {visuals.map((node) => (
        <mesh
          key={node.uuid}
          name={node.name}
          geometry={node.geometry}
          material={node.material}
          {...nodeProps(node)}
          raycast={() => null}
        />
      ))}
      {panels.map((node) => (
        <PanelHit
          key={node.uuid}
          node={node}
          hovered={hoveredPanel === node.name}
          cued={cuedPanel === node.name}
          clicked={clickedPanel === node.name}
          showPointer={showPointer}
          onHoverPanel={onHoverPanel}
          onClickPanel={onClickPanel}
        />
      ))}
      <CueFrame />
      <GradeFloat grade={grade} labelRef={gradeRef} />
    </group>
  );
}

useGLTF.preload("/Schnitzelbank_test2.glb");

export default Model;
