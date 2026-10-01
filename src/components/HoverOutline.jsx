import React, { useContext, useEffect, useRef } from "react";
import { EffectComposer, Outline, Selection, selectionContext } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";

// Adapted from the Interactive 3D Viewer's HoverOutline.
// HoverSelect adds the wrapped meshes to the outline selection while enabled.
export function HoverSelect({ enabled = false, children }) {
  const group = useRef(null);
  const api = useContext(selectionContext);

  useEffect(() => {
    if (!api || !enabled || !group.current) return undefined;
    const current = [];
    group.current.traverse((obj) => {
      if (obj.type !== "Mesh") return;
      current.push(obj);
    });
    if (!current.length) return undefined;
    api.select((state) => [...state, ...current]);
    return () => {
      api.select((state) => state.filter((selected) => !current.includes(selected)));
    };
  }, [enabled, children, api]);

  return <group ref={group}>{children}</group>;
}

export default function HoverOutline({ children }) {
  return (
    <Selection>
      <EffectComposer autoClear={false} multisampling={4} disableNormalPass>
        <Outline
          blendFunction={BlendFunction.SCREEN}
          edgeStrength={8}
          pulseSpeed={0}
          visibleEdgeColor={0xff4b00}
          hiddenEdgeColor={0x000000}
          kernelSize={KernelSize.MEDIUM}
          xRay={false}
        />
      </EffectComposer>
      {children}
    </Selection>
  );
}
