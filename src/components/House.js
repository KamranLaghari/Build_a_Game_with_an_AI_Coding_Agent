import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function createHouses(count = 3, mapBounds = 160) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/small_house.glb');
  const baseModel = gltf.scene;

  const housesGroup = new THREE.Group();
  const houses = [];

  const minDistanceToOrigin = 50;
  const minDistanceBetweenHouses = 70;
  const positions = [];

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    let valid = false;

    while (!valid && attempts < 100) {
      attempts++;
      x = (Math.random() * 2 - 1) * mapBounds * 0.7;
      y = (Math.random() * 2 - 1) * mapBounds * 0.7;

      const distToCenter = Math.hypot(x, y);
      if (distToCenter < minDistanceToOrigin) continue;

      let tooClose = false;
      for (const pos of positions) {
        if (Math.hypot(x - pos.x, y - pos.y) < minDistanceBetweenHouses) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        valid = true;
      }
    }

    positions.push({ x, y });

    const house = baseModel.clone(true);
    house.scale.setScalar(65);
    house.rotation.x = Math.PI / 2;
    const randomQuarterTurns = Math.floor(Math.random() * 4);
    house.rotation.y = randomQuarterTurns * (Math.PI / 2);

    house.position.set(x, y, 0);

    house.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(house);
    house.position.z = -box.min.z;

    house.updateMatrixWorld(true);
    const finalBox = new THREE.Box3().setFromObject(house);

    const houseData = {
      object: house,
      position: { x, y },
      box: finalBox,
      radius: Math.max(finalBox.max.x - finalBox.min.x, finalBox.max.y - finalBox.min.y) / 2,
    };

    houses.push(houseData);
    housesGroup.add(house);
  }

  function checkCollision(x, y, entityRadius = 5) {
    for (const h of houses) {
      const b = h.box;
      if (
        x >= b.min.x - entityRadius &&
        x <= b.max.x + entityRadius &&
        y >= b.min.y - entityRadius &&
        y <= b.max.y + entityRadius
      ) {
        return true;
      }
    }
    return false;
  }

  return {
    group: housesGroup,
    houses,
    checkCollision,
  };
}
