import * as THREE from "three";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

export function createCassetteModels(stage, projects) {
  const count = projects.length;
  const modelLoader = new MTLLoader();
  const objectLoader = new OBJLoader();
  const textureLoader = new THREE.TextureLoader();
  const modelObjects = [];
  let previousRenderTime = 0;
  const cassetteAngles = [0.08, -0.12, 0.18];
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.05, -1.05, 0.1, 100);
  camera.position.set(1.5, 0.66, 2.65);
  camera.lookAt(0, 0.25, 0);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x29352e, 2.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(2, 4, 3);
  scene.add(keyLight);

  const cassetteTexturePaths = [
    "textures/cassettes/cassette-orange.png",
    "textures/cassettes/cassette-jaune.png",
    "textures/cassettes/cassette-violette.png"
  ];
  const cassetteTextures = cassetteTexturePaths.map((path) => {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    texture.anisotropy = 1;
    return texture;
  });

  let referenceWidth = 390;
  let referenceHeight = 370;
  let pixelsPerWorldX = referenceWidth / 2.5;
  let pixelsPerWorldY = referenceHeight / 2.1;
  let cassetteScale = 1.55;

  function resize() {
    const stack = document.querySelector(".cassette-stack");
    referenceWidth = stack?.clientWidth || referenceWidth;
    referenceHeight = stack?.clientHeight || referenceHeight;
    pixelsPerWorldX = referenceWidth / 2.5;
    pixelsPerWorldY = referenceHeight / 2.1;
    cassetteScale = 2.05 * Math.max(1, referenceWidth / 390);
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.left = -window.innerWidth / 2 / pixelsPerWorldX;
    camera.right = window.innerWidth / 2 / pixelsPerWorldX;
    camera.top = window.innerHeight / 2 / pixelsPerWorldY;
    camera.bottom = -window.innerHeight / 2 / pixelsPerWorldY;
    camera.updateProjectionMatrix();
  }

  modelLoader.load("models/assets/Cassette.mtl", (materials) => {
    materials.preload();
    objectLoader.setMaterials(materials);
    objectLoader.load("models/assets/Cassette.obj", async (model) => {
      model.traverse((part) => {
        if (!part.isMesh) return;
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach((material) => {
          if (!material.map) return;
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.magFilter = THREE.NearestFilter;
          material.map.minFilter = THREE.NearestMipmapNearestFilter;
          material.map.anisotropy = 1;
          material.map.needsUpdate = true;
        });
        part.castShadow = true;
        part.receiveShadow = true;
      });

      for (let index = 0; index < count; index += 1) {
        const object = model.clone();
        const cassetteTexture = cassetteTextures[index % cassetteTextures.length];
        object.traverse((part) => {
          if (!part.isMesh) return;
          const sourceMaterials = Array.isArray(part.material) ? part.material : [part.material];
          const materials = sourceMaterials.map((material) => {
            const clonedMaterial = material.clone();
            clonedMaterial.map = cassetteTexture;
            clonedMaterial.needsUpdate = true;
            return clonedMaterial;
          });
          part.material = Array.isArray(part.material) ? materials : materials[0];
        });
        object.scale.setScalar(cassetteScale);
        object.rotation.set(0, cassetteAngles[index], 0);
        object.position.set([-0.18, 0.28, 0][index], index * 0.22, 0);

        await document.fonts.load("29px Bungee");
        const titleCanvas = document.createElement("canvas");
        titleCanvas.width = 512;
        titleCanvas.height = 64;
        const titleContext = titleCanvas.getContext("2d");
        titleContext.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
        titleContext.fillStyle = "#e4dcc7";
        titleContext.font = "29px 'Bungee', sans-serif";
        titleContext.textAlign = "center";
        titleContext.textBaseline = "middle";
        titleContext.fillText(projects[index].title.replace("<br>", " "), titleCanvas.width / 2, titleCanvas.height / 2);
        const titleTexture = new THREE.CanvasTexture(titleCanvas);
        titleTexture.colorSpace = THREE.SRGBColorSpace;
        titleTexture.minFilter = THREE.LinearFilter;
        titleTexture.magFilter = THREE.LinearFilter;
        const titleMaterial = new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true, depthWrite: false });
        const titlePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.1), titleMaterial);
        titlePlane.position.set(0, 0.064, 0.316);
        object.add(titlePlane);

          scene.add(object);
          modelObjects.push({ object, index, appearanceStartedAt: performance.now() + index * 160 });
      }
    });
  });

  function render(time) {
    const deltaTime = previousRenderTime ? Math.min(50, time - previousRenderTime) : 16;
    const rotationSmoothing = 1 - Math.exp(-deltaTime / 120);
    previousRenderTime = time;
    modelObjects.forEach(({ object, index, appearanceStartedAt }) => {
      const cassette = document.querySelector(`.cassette[data-index="${index}"]`);
      const bounds = cassette?.getBoundingClientRect();
      if (!bounds) {
        object.visible = false;
        return;
      }
      const targetX = (bounds.left + bounds.width / 2 - window.innerWidth / 2) / pixelsPerWorldX;
      const targetY = (window.innerHeight / 2 - bounds.top - bounds.height / 2) / pixelsPerWorldY;
      const appearanceProgress = THREE.MathUtils.clamp((time - appearanceStartedAt) / 420, 0, 1);
      const appearanceEase = 1 - Math.pow(1 - appearanceProgress, 3);
      const isInserted = cassette.classList.contains("is-inserted");
      object.position.x = targetX;
      object.position.y = targetY + (1 - appearanceEase) * 0.18;
      object.visible = !isInserted && appearanceProgress > 0;
      const hoverScale = cassette.classList.contains("is-hovered") ? 1.03 : 1;
      object.scale.setScalar(cassetteScale * (0.78 + appearanceEase * 0.22) * hoverScale);
        let targetRotationX = 0;
        let targetRotationY = cassetteAngles[index] + Math.sin(time * 0.0007 + index) * 0.006;
        if (cassette.classList.contains("is-dragging")) {
          targetRotationX = Math.PI / 2;
          targetRotationY = 0.52;
        } else if (cassette.classList.contains("is-settling")) {
          const settleProgress = Number(cassette.dataset.settleProgress || 0);
          targetRotationX = Math.PI / 2 * (1 - settleProgress);
          targetRotationY = 0.52 + (cassetteAngles[index] - 0.52) * settleProgress;
        }
        object.rotation.x = THREE.MathUtils.lerp(object.rotation.x, targetRotationX, rotationSmoothing);
        object.rotation.y = THREE.MathUtils.lerp(object.rotation.y, targetRotationY, rotationSmoothing);
        object.rotation.z = THREE.MathUtils.lerp(object.rotation.z, 0, rotationSmoothing);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function reveal(index) {
    const model = modelObjects.find((entry) => entry.index === index);
    if (model) model.appearanceStartedAt = performance.now();
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(render);

  return { reveal };
}
