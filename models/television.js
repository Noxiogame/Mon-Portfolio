import * as THREE from "three";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const SCREEN_WIDTH = 960;
const SCREEN_HEIGHT = 540;

function drawScreen(canvas, project, index, isEjected = false) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  context.save();
  context.translate(SCREEN_WIDTH, SCREEN_HEIGHT);
  context.scale(-1, -1);
  context.fillStyle = "#16221e";
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  context.fillStyle = "#e8ad45";
  context.font = "500 22px 'DM Mono', monospace";
  context.letterSpacing = "2px";
  context.fillText(isEjected ? "NO TAPE / READY" : `PLAY / 0${index + 1}`, 74, 52);

  context.fillStyle = "#f5bc43";
  context.shadowColor = "rgba(242, 188, 67, .85)";
  context.shadowBlur = 8;
  context.font = "500 76px 'Space Grotesk', sans-serif";
  const title = isEjected ? ["SIGNAL", "PAUSE"] : project.title.replace("<br>", "\n").split("\n");
  title.forEach((line, lineIndex) => context.fillText(line, 74, 174 + lineIndex * 68));

  context.shadowBlur = 0;
  context.fillStyle = "#e8ad45";
  context.fillRect(74, 315, 64, 4);
  context.font = "500 19px 'DM Mono', monospace";
  context.fillText(isEjected ? "NO TAPE / READY" : project.meta.replaceAll("&nbsp;", " "), 74, 365);

  context.fillStyle = "#d9d6bd";
  context.font = "400 20px 'Space Grotesk', sans-serif";
  const description = isEjected ? "Insérez une cassette pour découvrir un projet." : project.description;
  const words = description.split(" ");
  let line = "";
  let lineIndex = 0;
  words.forEach((word) => {
    const candidate = `${line} ${word}`.trim();
    if (context.measureText(candidate).width > 760 && line) {
      context.fillText(line, 74, 414 + lineIndex * 23);
      line = word;
      lineIndex += 1;
    } else {
      line = candidate;
    }
  });
  context.fillText(line, 74, 414 + lineIndex * 23);
  context.restore();
}

function mapScreenUvs(screenMesh) {
  const geometry = screenMesh.geometry;
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  const bounds = new THREE.Box3().setFromBufferAttribute(position);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    uv[index * 2] = (x - bounds.min.x) / size.x;
    uv[index * 2 + 1] = 1 - (y - bounds.min.y) / size.y;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export function createTelevisionModel(container, projects) {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
  const cameraTarget = new THREE.Vector3(0, 0.55, 0);
  const cameraDirection = new THREE.Vector3(2.7, 1.9, -4.4).sub(cameraTarget).normalize();
  camera.position.copy(cameraDirection).multiplyScalar(5.25).add(cameraTarget);
  camera.lookAt(cameraTarget);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff1d1, 0x24312d, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3);
  keyLight.position.set(2, 4, 4);
  scene.add(keyLight);

  const modelLoader = new MTLLoader();
  const objectLoader = new OBJLoader();
  let television;
  let screenMaterial;
  let baseScreenMap;
  let baseScreenUvs;
  let dynamicScreenUvs;
  let cassetteInserted = false;
  let staticAnimationId = null;
  let staticTimeoutId = null;

  function fitCameraToTelevision() {
    if (!television) return;
    const bounds = new THREE.Box3().setFromObject(television);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
    const narrowestHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    // Exact distance at which the television's bounding sphere just touches
    // the frame edges. A small safety margin (<1) is applied on top so the
    // render fills the container as much as possible without ever clipping,
    // regardless of the container's aspect ratio or size.
    const fittedDistance = sphere.radius / Math.tan(narrowestHalfFov);
    const marginFactor = 0.92;
    const distance = fittedDistance * marginFactor;
    camera.position.copy(cameraDirection).multiplyScalar(distance).add(cameraTarget);
    camera.lookAt(cameraTarget);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (television) {
      television.scale.setScalar(1.5 * Math.max(1, width / 520));
      fitCameraToTelevision();
    }
  }

  function restoreBaseScreen() {
    const screenMesh = television?.getObjectByName("screen");
    if (!screenMesh || !screenMaterial || !baseScreenMap || !baseScreenUvs) return;
    screenMesh.geometry.setAttribute("uv", baseScreenUvs);
    screenMaterial.map = baseScreenMap;
    screenMaterial.emissiveMap = null;
    screenMaterial.emissiveIntensity = 0;
    screenMaterial.needsUpdate = true;
  }

  function drawStaticFrame(context, frame) {
    context.fillStyle = frame % 3 === 0 ? "#c3c7ae" : "#6b7667";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    const image = context.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    const pixels = image.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const value = Math.random() > 0.5 ? 235 : 20;
      const variation = Math.floor(Math.random() * 35);
      pixels[index] = Math.min(255, value + variation);
      pixels[index + 1] = Math.min(255, value + variation);
      pixels[index + 2] = Math.min(255, value + variation * 0.7);
      pixels[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    context.fillStyle = "rgba(12, 20, 17, .22)";
    for (let y = frame % 8; y < SCREEN_HEIGHT; y += 8) context.fillRect(0, y, SCREEN_WIDTH, 2);
  }

  function playStaticTransition(projectIndex) {
    if (!screenMaterial || !dynamicScreenUvs) {
      drawScreen(canvas, projects[projectIndex], projectIndex);
      texture.needsUpdate = true;
      return;
    }

    const context = canvas.getContext("2d");
    const startedAt = performance.now();
    const duration = 260;
    cancelAnimationFrame(staticAnimationId);
    clearTimeout(staticTimeoutId);

    function animateStatic(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      drawStaticFrame(context, Math.floor(now / 32));
      texture.needsUpdate = true;
      if (progress < 1) {
        staticAnimationId = requestAnimationFrame(animateStatic);
        return;
      }
      drawScreen(canvas, projects[projectIndex], projectIndex);
      texture.needsUpdate = true;
    }

    staticAnimationId = requestAnimationFrame(animateStatic);
    staticTimeoutId = setTimeout(() => cancelAnimationFrame(staticAnimationId), duration + 40);
  }

  modelLoader.load("models/assets/television.mtl", (materials) => {
    materials.preload();
    objectLoader.setMaterials(materials);
    objectLoader.load("models/assets/television.obj", (model) => {
      television = model;
      television.position.set(0, -0.3, 0);
      television.rotation.y = -0.12;

      television.traverse((part) => {
        if (!part.isMesh) return;
        if (part.name.toLowerCase() === "screen") {
          baseScreenMap = part.material.map;
          baseScreenUvs = part.geometry.attributes.uv.clone();
          mapScreenUvs(part);
          dynamicScreenUvs = part.geometry.attributes.uv.clone();
          screenMaterial = part.material.clone();
          screenMaterial.map = texture;
          screenMaterial.emissive = new THREE.Color(0x16221e);
          screenMaterial.emissiveMap = texture;
          screenMaterial.emissiveIntensity = 0.75;
          part.material = screenMaterial;
          part.renderOrder = 2;
        }
        if (part.material.map) {
          part.material.map.colorSpace = THREE.SRGBColorSpace;
          part.material.map.magFilter = THREE.NearestFilter;
          part.material.map.minFilter = THREE.NearestMipmapNearestFilter;
          part.material.map.needsUpdate = true;
        }
      });
      scene.add(television);
      if (!cassetteInserted) restoreBaseScreen();
      resize();
    });
  });

  function render() {
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function update(projectIndex, isEjected = false) {
    if (isEjected) {
      cassetteInserted = false;
      restoreBaseScreen();
      return;
    }

    cassetteInserted = true;
    const screenMesh = television?.getObjectByName("screen");
    if (screenMesh && screenMaterial && dynamicScreenUvs) {
      screenMesh.geometry.setAttribute("uv", dynamicScreenUvs);
      screenMaterial.map = texture;
      screenMaterial.emissiveMap = texture;
      screenMaterial.emissiveIntensity = 0.75;
      screenMaterial.needsUpdate = true;
    }
    playStaticTransition(projectIndex);
  }

  update(0, true);
  resize();
  window.addEventListener("resize", resize);
  render();

  return { update };
}
