// The board faces +X. Y is up, Z runs across the poster.
// The view never follows the cued panel. Zoom moves along X only.
// Pan slides in Y and Z. The camera does not turn.
export const cameraConfig = {
  position: [3.7, 1, 0],
  target: [0, 1, 0],
  fov: 34,
  near: 0.01,
  far: 40,
  minDistance: 1.35,
  maxDistance: 6.2,
  panLimit: { y: 1.25, z: 0.85 },
};

let placed = false;

export function applyCamera(camera) {
  if (placed) return;
  placed = true;
  camera.position.set(...cameraConfig.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(...cameraConfig.target);
  camera.fov = cameraConfig.fov;
  camera.near = cameraConfig.near;
  camera.far = cameraConfig.far;
  camera.updateProjectionMatrix();
}
