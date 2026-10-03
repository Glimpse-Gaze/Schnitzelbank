import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const box = new THREE.Box3();
const center = new THREE.Vector3();

// One stick for every panel. This is the old large-panel size, plus 20%.
const HAND_SCALE = 0.36 * 1.2;

// The artwork points up and to the left. Anchoring the sprite on the fingertip
// keeps that orientation and aims the finger at the panel.
const FINGERTIP = [0.22, 0.82];

let handTexture = null;
let handTextureRequest = null;

function loadHandTexture() {
  if (handTexture) return Promise.resolve(handTexture);
  if (!handTextureRequest) {
    handTextureRequest = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        "/Pointing.png",
        (next) => {
          next.colorSpace = THREE.SRGBColorSpace;
          handTexture = next;
          resolve(next);
        },
        undefined,
        reject,
      );
    });
  }
  return handTextureRequest;
}

export default function PointingHand({ target }) {
  const sprite = useRef(null);
  const [texture, setTexture] = useState(handTexture);

  useEffect(() => {
    let active = true;
    loadHandTexture().then((next) => {
      if (active) setTexture(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useFrame(() => {
    const mesh = target.current;
    const hand = sprite.current;
    if (!mesh || !hand) return;
    box.setFromObject(mesh);
    box.getCenter(center);
    hand.position.set(center.x + 0.03, center.y, center.z);
    hand.scale.set(HAND_SCALE, HAND_SCALE, 1);
  });

  if (!texture) return null;

  return (
    <sprite ref={sprite} center={FINGERTIP} raycast={() => null} renderOrder={2}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
