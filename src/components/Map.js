import * as THREE from 'three';

export function createMap(gridSize = 25, tileSize = 20) {
  const mapGroup = new THREE.Group();

  const darkMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
  const lightMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
  const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);

  const halfGrid = gridSize / 2;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const isDark = (i + j) % 2 === 0;
      const material = isDark ? darkMaterial : lightMaterial;
      const tile = new THREE.Mesh(tileGeometry, material);

      const x = (i - halfGrid + 0.5) * tileSize;
      const y = (j - halfGrid + 0.5) * tileSize;

      tile.position.set(x, y, 0);
      tile.receiveShadow = true;
      mapGroup.add(tile);
    }
  }

  return {
    group: mapGroup,
    gridSize,
    tileSize,
    mapSize: gridSize * tileSize,
  };
}
