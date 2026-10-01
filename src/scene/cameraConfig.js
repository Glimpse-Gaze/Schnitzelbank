// Test board faces +X. Y is up, Z runs across the poster.
// Bounds of Schnitzelbank_test.glb are about x -0.09..0.03, y 0..2, z -0.5..0.5.
// Orbit is intentionally absent: this camera only frames the front.
export const cameraConfig = {
  position: [3.7, 1, 0],
  target: [0, 1, 0],
  fov: 34,
  near: 0.01,
  far: 40,
};

export function applyCamera(camera) {
  camera.position.set(...cameraConfig.position);
  camera.lookAt(...cameraConfig.target);
  camera.fov = cameraConfig.fov;
  camera.near = cameraConfig.near;
  camera.far = cameraConfig.far;
  camera.updateProjectionMatrix();
}
