import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const ENEMY_SPEED = 22;
export const SPAWN_DELAY = 3.5;
export const ENEMY_RADIUS = 6;
export const MIN_ENEMY_DISTANCE = 12;

export async function createEnemyManager(scene, mapBoundary = 180) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/enemy.glb');
  const baseModel = gltf.scene;
  const animations = gltf.animations || [];

  baseModel.scale.setScalar(5);
  baseModel.rotation.order = 'ZXY';
  baseModel.rotation.x = Math.PI / 2;
  baseModel.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(baseModel);
  const baseZ = -box.min.z;
  baseModel.position.z = baseZ;

  const flyingClip =
    animations.find((a) => a.name.includes('Fast_Flying')) ||
    animations.find((a) => a.name.includes('Flying')) ||
    animations[0] ||
    null;

  const spawnLocations = [
    { x: -mapBoundary, y: -mapBoundary },
    { x: mapBoundary, y: -mapBoundary },
    { x: -mapBoundary, y: mapBoundary },
    { x: mapBoundary, y: mapBoundary },
  ];

  let spawnIndex = 0;
  const enemies = [];
  let spawnTimer = 0;
  let currentSpawnDelay = SPAWN_DELAY;
  let currentSpeed = ENEMY_SPEED;

  function spawnOne(customPos = null) {
    const pos = customPos || spawnLocations[spawnIndex % spawnLocations.length];
    spawnIndex++;

    const group = new THREE.Group();
    const model = SkeletonUtils.clone(baseModel);
    model.rotation.order = 'ZXY';
    model.rotation.x = Math.PI / 2;
    model.position.z = baseZ;

    let mixer = null;
    if (flyingClip) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(flyingClip);
      action.play();
    }

    group.add(model);
    group.position.set(pos.x, pos.y, 0);

    scene.add(group);

    const enemy = {
      group,
      model,
      mixer,
      x: pos.x,
      y: pos.y,
      radius: ENEMY_RADIUS,
      isDefeated: false,
    };

    enemies.push(enemy);
    return enemy;
  }

  function spawnInitial() {
    clearAll();
    spawnLocations.forEach((pos) => {
      spawnOne(pos);
    });
  }

  function clearAll() {
    for (const e of enemies) {
      scene.remove(e.group);
      if (e.mixer) e.mixer.stopAllAction();
    }
    enemies.length = 0;
    spawnTimer = 0;
  }

  function removeEnemy(enemy) {
    if (!enemy) return;
    enemy.isDefeated = true;
    scene.remove(enemy.group);
    if (enemy.mixer) {
      enemy.mixer.stopAllAction();
    }
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) {
      enemies.splice(idx, 1);
    }
  }

  function update(delta, playerPos, checkHouseCollision) {
    spawnTimer += delta;
    if (spawnTimer >= currentSpawnDelay) {
      spawnTimer = 0;
      spawnOne();
    }

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.isDefeated) continue;

      if (e.mixer) {
        e.mixer.update(delta);
      }

      const dx = playerPos.x - e.x;
      const dy = playerPos.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;

        const facingAngle = Math.atan2(ny, nx) - Math.PI / 2;
        e.model.rotation.z = facingAngle;

        // Base velocity towards player
        let vx = nx * currentSpeed;
        let vy = ny * currentSpeed;

        // Soft separation from other enemies to prevent stacking
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;
          const other = enemies[j];
          if (other.isDefeated) continue;

          const edx = e.x - other.x;
          const edy = e.y - other.y;
          const edist = Math.hypot(edx, edy);

          if (edist < MIN_ENEMY_DISTANCE && edist > 0.001) {
            const push = (MIN_ENEMY_DISTANCE - edist) / MIN_ENEMY_DISTANCE;
            vx += (edx / edist) * currentSpeed * push * 1.5;
            vy += (edy / edist) * currentSpeed * push * 1.5;
          }
        }

        // Clamp total movement speed
        const speedMagnitude = Math.hypot(vx, vy);
        if (speedMagnitude > currentSpeed * 1.5) {
          vx = (vx / speedMagnitude) * currentSpeed * 1.5;
          vy = (vy / speedMagnitude) * currentSpeed * 1.5;
        }

        const nextX = e.x + vx * delta;
        const nextY = e.y + vy * delta;

        // House / obstacle collision with sliding fallback
        const collidesFull = checkHouseCollision && checkHouseCollision(nextX, nextY, ENEMY_RADIUS);

        if (!collidesFull) {
          e.x = nextX;
          e.y = nextY;
        } else {
          // Slide along X if possible
          const collidesX = checkHouseCollision && checkHouseCollision(nextX, e.y, ENEMY_RADIUS);
          const collidesY = checkHouseCollision && checkHouseCollision(e.x, nextY, ENEMY_RADIUS);

          if (!collidesX) {
            e.x = nextX;
          } else if (!collidesY) {
            e.y = nextY;
          }
        }

        e.group.position.set(e.x, e.y, 0);
      }
    }
  }

  return {
    enemies,
    getEnemies: () => enemies,
    spawnInitial,
    spawnOne,
    clearAll,
    removeEnemy,
    update,
    setSpeed: (s) => {
      currentSpeed = s;
    },
    setSpawnDelay: (d) => {
      currentSpawnDelay = d;
    },
  };
}
