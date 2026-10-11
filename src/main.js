import * as THREE from 'three';
import './style.css';
import { createRenderer } from './components/Renderer.js';
import { createCamera } from './components/Camera.js';
import { createMap } from './components/Map.js';
import { createHouses } from './components/House.js';
import { createPlayer } from './components/Player.js';
import { createEnemyManager } from './components/Enemy.js';

// Centralized Difficulty Configuration
export const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy',
    description: 'Slower enemies and longer spawn intervals for a forgiving beginner experience.',
    enemySpeed: 15,
    spawnDelay: 4.8,
    playerSpeed: 3.8,
    attackCooldown: 0.8,
    attackRadius: 40,
    growthFactor: 0.0025,
  },
  medium: {
    name: 'Medium',
    description: 'Standard challenge with balanced enemy speed and spawning.',
    enemySpeed: 22,
    spawnDelay: 3.5,
    playerSpeed: 3.5,
    attackCooldown: 1.0,
    attackRadius: 35,
    growthFactor: 0.005,
  },
  hard: {
    name: 'Hard',
    description: 'Fast enemies and rapid spawns for an intense survival challenge.',
    enemySpeed: 30,
    spawnDelay: 2.2,
    playerSpeed: 3.5,
    attackCooldown: 1.1,
    attackRadius: 32,
    growthFactor: 0.0075,
  },
};

const SCORE_PER_SECOND = 0.1;
const SCORE_PER_KILL = 10;

async function initGame() {
  // 1. Scene setup
  const scene = new THREE.Scene();

  // 2. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(-100, -100, 200);
  scene.add(directionalLight);

  // 3. Renderer & Camera
  const renderer = createRenderer();
  const camera = createCamera();

  // 4. Map & Environment
  const map = createMap(25, 20);
  scene.add(map.group);

  const houseData = await createHouses(3, 150);
  scene.add(houseData.group);

  // 5. Player
  const player = await createPlayer(scene);
  player.group.add(camera);
  player.setEnabled(false);

  // 6. Enemies
  const enemyManager = await createEnemyManager(scene, 180);

  // 7. UI elements
  const scoreElement = document.querySelector('.score');
  const difficultyMenuElement = document.querySelector('.difficulty-menu');
  const difficultyDescElement = document.getElementById('difficulty-desc');
  const difficultyButtons = document.querySelectorAll('.difficulty-btn');
  const startBtn = document.querySelector('.start-btn');
  const gameOverElement = document.querySelector('.game-over');
  const finalScoreElement = document.querySelector('.game-over .final-score');
  const restartBtn = document.querySelector('.restart-btn');
  const menuBtn = document.querySelector('.menu-btn');

  // 8. Game State
  let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'
  let selectedDifficulty = 'medium';
  let score = 0;
  const clock = new THREE.Clock();
  const hitEffects = [];

  function spawnHitEffect(x, y) {
    const geo = new THREE.RingGeometry(2, 12, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0.3);
    scene.add(mesh);
    hitEffects.push({ mesh, mat, geo, progress: 0, duration: 0.25 });
  }

  function clearHitEffects() {
    for (const effect of hitEffects) {
      scene.remove(effect.mesh);
      effect.geo.dispose();
      effect.mat.dispose();
    }
    hitEffects.length = 0;
  }

  function updateScoreUI() {
    if (scoreElement) {
      scoreElement.textContent = Math.floor(score).toString();
    }
  }

  function applyDifficultyScaling() {
    const config = DIFFICULTY_CONFIG[selectedDifficulty] || DIFFICULTY_CONFIG.medium;
    const factor = score * config.growthFactor;

    // Enemy scaling (scales dynamically with progression)
    const enemySpeed = config.enemySpeed * (1 + factor * 2.2);
    const spawnDelay = Math.max(0.6, config.spawnDelay / (1 + factor * 2.5));
    enemyManager.setSpeed(enemySpeed);
    enemyManager.setSpawnDelay(spawnDelay);

    // Player scaling
    const playerSpeed = config.playerSpeed * (1 + factor * 0.8);
    const attackCd = Math.max(0.2, config.attackCooldown / (1 + factor * 1.2));
    const attackRadius = config.attackRadius * (1 + factor * 0.6);
    player.setSpeed(playerSpeed);
    player.setAttackCooldown(attackCd);
    player.setAttackRadius(attackRadius);
  }

  function selectDifficulty(diff) {
    if (!DIFFICULTY_CONFIG[diff]) return;
    selectedDifficulty = diff;

    difficultyButtons.forEach((btn) => {
      if (btn.dataset.difficulty === diff) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (difficultyDescElement) {
      difficultyDescElement.textContent = DIFFICULTY_CONFIG[diff].description;
    }
  }

  function startGame() {
    gameState = 'playing';
    score = 0;
    updateScoreUI();

    if (difficultyMenuElement) {
      difficultyMenuElement.style.display = 'none';
    }
    if (gameOverElement) {
      gameOverElement.style.display = 'none';
    }
    if (scoreElement) {
      scoreElement.style.display = 'block';
    }

    clearHitEffects();
    player.reset();
    player.setEnabled(true);
    applyDifficultyScaling();
    enemyManager.spawnInitial();
    clock.start();
  }

  function triggerGameOver() {
    if (gameState === 'gameover') return;
    gameState = 'gameover';

    player.setVisible(false);
    player.setEnabled(false);
    if (gameOverElement) {
      gameOverElement.style.display = 'flex';
    }
    if (finalScoreElement) {
      finalScoreElement.textContent = `Score: ${Math.floor(score)}`;
    }
  }

  function restartGame() {
    startGame();
  }

  function showDifficultyMenu() {
    gameState = 'menu';
    if (gameOverElement) {
      gameOverElement.style.display = 'none';
    }
    if (scoreElement) {
      scoreElement.style.display = 'none';
    }
    if (difficultyMenuElement) {
      difficultyMenuElement.style.display = 'flex';
    }

    clearHitEffects();
    enemyManager.clearAll();
    player.reset();
    player.setEnabled(false);
  }

  // UI Event Handlers
  difficultyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.difficulty;
      selectDifficulty(diff);
    });
  });

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startGame();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      restartGame();
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      showDifficultyMenu();
    });
  }

  // Handle Space key for Attack & Reset
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'gameover') {
        restartGame();
      } else if (gameState === 'playing') {
        const attack = player.triggerAttack();
        if (attack) {
          const enemies = enemyManager.getEnemies();
          const defeatedEnemies = [];

          for (const enemy of enemies) {
            if (enemy.isDefeated) continue;
            const dist = Math.hypot(enemy.x - attack.x, enemy.y - attack.y);
            if (dist <= attack.radius + enemy.radius) {
              defeatedEnemies.push(enemy);
            }
          }

          for (const defeated of defeatedEnemies) {
            if (defeated.isDefeated) continue;
            defeated.isDefeated = true;
            spawnHitEffect(defeated.x, defeated.y);
            enemyManager.removeEnemy(defeated);
            score += SCORE_PER_KILL;
          }

          if (defeatedEnemies.length > 0) {
            updateScoreUI();
          }
        }
      }
    }
  });

  // Handle Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Initial UI state setup
  selectDifficulty('medium');

  // Animation Loop
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);

    // Update active hit visual effects
    for (let i = hitEffects.length - 1; i >= 0; i--) {
      const effect = hitEffects[i];
      effect.progress += delta;
      const t = effect.progress / effect.duration;
      if (t >= 1) {
        scene.remove(effect.mesh);
        effect.geo.dispose();
        effect.mat.dispose();
        hitEffects.splice(i, 1);
      } else {
        const scale = 1 + t * 1.8;
        effect.mesh.scale.set(scale, scale, 1);
        effect.mat.opacity = (1 - t) * 0.9;
      }
    }

    if (gameState === 'playing') {
      // 1. Time-based survival scoring
      score += delta * SCORE_PER_SECOND;
      updateScoreUI();

      // 2. Dynamic difficulty recalculation
      applyDifficultyScaling();

      // 3. Player update with obstacle collisions
      player.update(delta, (x, y, radius) => {
        // Boundary check
        const halfMap = map.mapSize / 2 - 10;
        if (Math.abs(x) > halfMap || Math.abs(y) > halfMap) {
          return true;
        }
        return houseData.checkCollision(x, y, radius);
      });

      // 4. Enemy update
      enemyManager.update(delta, player.position, (x, y, radius) => {
        return houseData.checkCollision(x, y, radius);
      });

      // 5. Game Over detection (Enemy vs Player collision)
      const enemies = enemyManager.getEnemies();
      for (const enemy of enemies) {
        if (enemy.isDefeated) continue;
        const dist = Math.hypot(enemy.x - player.position.x, enemy.y - player.position.y);
        const collisionThreshold = enemy.radius + player.radius;
        if (dist <= collisionThreshold) {
          triggerGameOver();
          break;
        }
      }
    }

    renderer.render(scene, camera);
  });
}

initGame().catch((err) => {
  console.error('Failed to initialize game:', err);
});
