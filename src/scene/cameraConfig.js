// The board faces +X. Y is up, Z runs across the poster.
// Zoom changes distance along X. Pan slides the view in Y and Z only.
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

export function applyCamera(camera) {
  camera.position.set(...cameraConfig.position);
  camera.lookAt(...cameraConfig.target);
  camera.fov = cameraConfig.fov;
  camera.near = cameraConfig.near;
  camera.far = cameraConfig.far;
  camera.updateProjectionMatrix();
}
