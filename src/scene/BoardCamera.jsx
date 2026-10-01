import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { applyCamera } from "./cameraConfig.js";

export default function BoardCamera() {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    applyCamera(camera);
  }, [camera]);

  return null;
}
