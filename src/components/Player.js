import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const JUMP_HEIGHT = 15;
export const JUMP_DISTANCE = 20;
export const DEFAULT_SPEED = 3.5;
export const ATTACK_COOLDOWN = 1.0;
export const ATTACK_RADIUS = 35;
export const PLAYER_RADIUS = 8;

export async function createPlayer(scene) {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/tode.glb');
  const model = gltf.scene;

  model.scale.setScalar(20);
  model.rotation.order = 'ZXY';
  model.rotation.x = Math.PI / 2;
  model.rotation.z = Math.PI;

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const baseZ = -box.min.z;
  model.position.z = baseZ;

  group.add(model);
  scene.add(group);

  const inputQueue = [];
  let isEnabled = true;

  let movementSpeed = DEFAULT_SPEED;
  let attackCooldownTime = ATTACK_COOLDOWN;
  let attackRadius = ATTACK_RADIUS;

  let isMoving = false;
  let moveProgress = 0;
  let moveStartPos = new THREE.Vector2(0, 0);
  let moveTargetPos = new THREE.Vector2(0, 0);
  let currentDir = new THREE.Vector2(0, 1);

  let attackTimer = 0;
  let attackVisual = null;
  let attackVisualTime = 0;

  // Attack visual mesh
  const attackGeometry = new THREE.CircleGeometry(attackRadius, 32);
  const attackMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  attackVisual = new THREE.Mesh(attackGeometry, attackMaterial);
  attackVisual.position.z = 0.25;
  attackVisual.visible = false;
  scene.add(attackVisual);

  function handleKeyDown(e) {
    if (!isEnabled) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      let dir = null;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') dir = new THREE.Vector2(0, 1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') dir = new THREE.Vector2(0, -1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dir = new THREE.Vector2(-1, 0);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') dir = new THREE.Vector2(1, 0);

      if (dir) {
        inputQueue.push(dir);
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  function reset() {
    group.position.set(0, 0, 0);
    model.position.z = baseZ;
    model.rotation.z = Math.PI;
    inputQueue.length = 0;
    isMoving = false;
    moveProgress = 0;
    currentDir.set(0, 1);
    attackTimer = 0;
    if (attackVisual) attackVisual.visible = false;
    group.visible = true;
  }

  function setVisible(visible) {
    group.visible = visible;
    if (!visible && attackVisual) {
      attackVisual.visible = false;
    }
  }

  function setEnabled(enabled) {
    isEnabled = enabled;
    if (!enabled) {
      inputQueue.length = 0;
    }
  }

  function triggerAttack() {
    if (!isEnabled || attackTimer > 0) return null;

    attackTimer = attackCooldownTime;
    attackVisualTime = 0.25;

    attackVisual.geometry.dispose();
    attackVisual.geometry = new THREE.CircleGeometry(attackRadius, 32);
    attackVisual.position.set(group.position.x, group.position.y, 0.25);
    attackVisual.visible = true;
    attackMaterial.opacity = 0.8;

    return {
      x: group.position.x,
      y: group.position.y,
      radius: attackRadius,
    };
  }

  function update(delta, checkObstacleCollision) {
    if (attackTimer > 0) {
      attackTimer -= delta;
    }

    if (attackVisual && attackVisual.visible) {
      attackVisualTime -= delta;
      if (attackVisualTime <= 0) {
        attackVisual.visible = false;
      } else {
        attackMaterial.opacity = (attackVisualTime / 0.25) * 0.8;
      }
    }

    if (isMoving) {
      moveProgress += movementSpeed * delta;
      if (moveProgress >= 1) {
        moveProgress = 1;
        isMoving = false;
        group.position.x = moveTargetPos.x;
        group.position.y = moveTargetPos.y;
        model.position.z = baseZ;
      } else {
        group.position.x = THREE.MathUtils.lerp(moveStartPos.x, moveTargetPos.x, moveProgress);
        group.position.y = THREE.MathUtils.lerp(moveStartPos.y, moveTargetPos.y, moveProgress);
        model.position.z = baseZ + Math.sin(moveProgress * Math.PI) * JUMP_HEIGHT;
      }
    }

    if (!isMoving && inputQueue.length > 0) {
      const nextDir = inputQueue.shift();
      currentDir.copy(nextDir);

      const facingAngle = Math.atan2(nextDir.y, nextDir.x) + Math.PI / 2;
      model.rotation.z = facingAngle;

      const targetX = group.position.x + nextDir.x * JUMP_DISTANCE;
      const targetY = group.position.y + nextDir.y * JUMP_DISTANCE;

      if (!checkObstacleCollision || !checkObstacleCollision(targetX, targetY, PLAYER_RADIUS)) {
        isMoving = true;
        moveProgress = 0;
        moveStartPos.set(group.position.x, group.position.y);
        moveTargetPos.set(targetX, targetY);
      }
    }
  }

  return {
    group,
    model,
    reset,
    setVisible,
    setEnabled,
    triggerAttack,
    update,
    get position() {
      return group.position;
    },
    radius: PLAYER_RADIUS,
    setSpeed(speed) {
      movementSpeed = speed;
    },
    setAttackCooldown(cd) {
      attackCooldownTime = cd;
    },
    setAttackRadius(r) {
      attackRadius = r;
    },
  };
}
