import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { applyCamera } from "./cameraConfig.js";

export default function BoardCamera() {
  const camera = useThree((state) => state.camera);

  // Places the opening view once. Later panel changes must not move it.
  useLayoutEffect(() => {
    applyCamera(camera);
  }, [camera]);

  return null;
}
