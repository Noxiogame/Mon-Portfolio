import { createCassetteModels } from "./models/cassette.js";
import { createTelevisionModel } from "./models/television.js";

const projects = [
  { title: "TEST<br>1", meta: "TEST 1", description: "TEST 1", lead: "TEST 1", content: "<p>TEST 1</p>" },
  { title: "TEST<br>2", meta: "TEST 2", description: "TEST 2", lead: "TEST 2", content: "<p>TEST 2</p>" },
  { title: "SOUL<br>FRACT", meta: "JEU VIDÉO + UNIVERS&nbsp;&nbsp; / &nbsp;&nbsp;2025", description: "Un jeu de survie et d'exploration où chaque âme porte la mémoire d'un autre monde.", lead: "Soulfract est un jeu de survie, d'exploration et de création dans un monde où les âmes voyagent entre les étoiles.", content: "<p>Les étoiles produisent des âmes, fragments d'une Lumière Primordiale. Lorsqu'une âme trouve un corps, elle se fond à lui et laisse une marque qui influence sa trajectoire.</p><h3>Un monde à choisir</h3><p>Le joueur se réveille dans un corps étranger, avec des souvenirs incomplets. Il peut protéger les âmes, traquer les Ombres, étudier les fusions ou chercher sa propre mission.</p><h3>La fracture</h3><p>Certains êtres abritent plusieurs âmes. Cette puissance exceptionnelle a un prix : l'instabilité, les voix et le risque de devenir une Ombre. Le monde change selon les choix du joueur.</p><div class=\"sheet-tags\"><span>EXPLORATION</span><span>SURVIE</span><span>LORE</span><span>CRÉATION</span></div>" }
];

const stack = document.querySelector("#cassetteStack");
const screenContent = document.querySelector("#screenContent");
const projectTitle = document.querySelector("#projectTitle");
const projectMeta = document.querySelector("#projectMeta");
const projectDescription = document.querySelector("#projectDescription");
const tapeCount = document.querySelector("#tapeCount");
const projectSheet = document.querySelector("#projectSheet");
const sheetKicker = document.querySelector("#sheetKicker");
const sheetIndex = document.querySelector("#sheetIndex");
const sheetTitle = document.querySelector("#sheetTitle");
const sheetMeta = document.querySelector("#sheetMeta");
const sheetLead = document.querySelector("#sheetLead");
const sheetContent = document.querySelector("#sheetContent");
const televisionDropZone = document.querySelector(".tv-wrap");
const skillsOrbit = document.querySelector(".skills-orbit");
const skillsToggle = document.querySelector("#skillsToggle");
const skillBubbles = [...document.querySelectorAll(".skill-bubble")];
const wallCopy = document.querySelector(".wall-copy");
const televisionModel = createTelevisionModel(document.querySelector("#televisionModel"), projects);
const stage = document.createElement("div");
stage.className = "cassette-stage";
document.body.appendChild(stage);
const cassetteElements = [];
const cassetteHitAreas = [];
let cassetteOrder = projects.map((_, index) => index);
const cassetteModels = createCassetteModels(stage, projects);

function startWallCopyAnimation() {
  if (!wallCopy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const textNodes = [];
  const walker = document.createTreeWalker(wallCopy, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.textContent.trim()) textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  let characterIndex = 0;
  textNodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    textNode.textContent.split(/(\s+)/).forEach((token) => {
      if (/^\s+$/.test(token)) {
        [...token].forEach((character) => {
          const span = document.createElement("span");
          span.className = "typewriter-character is-space";
          span.textContent = character;
          span.style.setProperty("--character-delay", `${characterIndex * 24}ms`);
          fragment.appendChild(span);
          characterIndex += 1;
        });
        return;
      }

      if (!token) return;
      const word = document.createElement("span");
      word.className = "typewriter-word";
      [...token].forEach((character) => {
        const span = document.createElement("span");
        span.className = "typewriter-character";
        span.textContent = character;
        span.style.setProperty("--character-delay", `${characterIndex * 24}ms`);
        word.appendChild(span);
        characterIndex += 1;
      });
      fragment.appendChild(word);
    });
    textNode.replaceWith(fragment);
  });

  wallCopy.classList.add("is-typing");
}

startWallCopyAnimation();

let draggedCassette = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragStartX = 0;
let dragStartY = 0;
let didDrag = false;
let suppressCassetteClick = false;
let insertedCassetteIndex = null;

projects.forEach((project, index) => {
  const cassette = document.createElement("button");
  cassette.className = "cassette";
  cassette.type = "button";
  cassette.dataset.index = index;
  cassette.setAttribute("aria-label", `Lire le projet ${project.title.replace("<br>", " ")}`);
  cassette.innerHTML = `<span class="cassette-label"><span>ML / 0${index + 1}</span><span>TAPE</span></span><span class="cassette-info"><h3>${project.title}</h3><span class="cassette-meta">PROJET / 0${index + 1}</span></span>`;
  const hitArea = document.createElement("span");
  hitArea.className = "cassette-hit-area";
  hitArea.setAttribute("aria-hidden", "true");
  hitArea.addEventListener("pointerdown", (event) => startDragging(event, cassette, index));
  hitArea.addEventListener("click", () => {
    if (suppressCassetteClick) {
      suppressCassetteClick = false;
      return;
    }
    if (insertedCassetteIndex !== index) insertCassette(index, false);
  });
  hitArea.addEventListener("pointerenter", () => cassette.classList.add("is-hovered"));
  hitArea.addEventListener("pointerleave", () => cassette.classList.remove("is-hovered"));
  stack.appendChild(cassette);
  stack.appendChild(hitArea);
  cassetteElements[index] = cassette;
  cassetteHitAreas[index] = hitArea;
});
layoutCassettes();
window.addEventListener("resize", layoutCassettes);

function layoutCassettes() {
  const isDesktop = window.matchMedia("(min-width: 1001px)").matches;
  const referenceCassette = cassetteElements.find(Boolean);
  const cassetteHeight = referenceCassette?.offsetHeight ?? 0;
  const cassetteWidth = referenceCassette?.offsetWidth ?? 0;
  const stackHeight = stack.clientHeight;
  // Derive the gap from the actual measured stack/cassette sizes so the
  // stagger always matches the container, instead of a fixed pixel value
  // that looks too tight on small screens and leaves a floating gap on
  // large ones.
  // The gap must be based on the *total* number of cassettes, not how many
  // currently remain in the stack. Otherwise, as soon as one cassette is
  // inserted into the television (removed from the visible stack), the
  // remaining ones spread out to fill the freed-up space, breaking the
  // consistent stacking illusion (visible when only 2 of 3 remain).
  const spareSpace = Math.max(0, stackHeight - cassetteHeight);
  const rawGap = (spareSpace / (projects.length - 1 || 1)) * 0.5;
  const gap = isDesktop ? Math.max(20, Math.round(rawGap)) : Math.max(14, Math.round(rawGap));
  const horizontalStep = cassetteWidth * 0.045;
  const offsets = isDesktop ? [0, horizontalStep, -horizontalStep * 0.5] : [0, 0, 0];

  cassetteOrder.forEach((cassetteIndex, bottomIndex) => {
    const cassette = cassetteElements[cassetteIndex];
    const hitArea = cassetteHitAreas[cassetteIndex];
    if (!cassette || cassette.classList.contains("is-dragging")) return;
    const cassetteHeight = cassette.offsetHeight;
    cassette.style.setProperty("top", "auto", "important");
    cassette.style.setProperty("bottom", `${bottomIndex * gap}px`, "important");
    cassette.style.setProperty("left", `${offsets[bottomIndex] ?? 0}px`, "important");
    cassette.style.setProperty("z-index", `${bottomIndex + 1}`, "important");
    hitArea.style.setProperty("bottom", `${bottomIndex * gap}px`, "important");
    hitArea.style.setProperty("left", `${offsets[bottomIndex] ?? 0}px`, "important");
    hitArea.style.setProperty("width", `${cassette.offsetWidth}px`, "important");
    hitArea.style.setProperty("height", `${cassetteHeight}px`, "important");
    hitArea.style.setProperty("z-index", `${bottomIndex + 1}`, "important");
    hitArea.style.visibility = cassette.classList.contains("is-inserted") ? "hidden" : "visible";
  });
}

function startDragging(event, cassette, index) {
  if (event.button !== 0 || cassette.classList.contains("is-inserted")) return;
  event.preventDefault();
  suppressCassetteClick = false;
  televisionModel.setDropZoneActive(true);
  document.body.classList.add("is-dragging-cassette");

  const bounds = cassette.getBoundingClientRect();
  draggedCassette = { cassette, index, bounds };
  dragOffsetX = event.clientX - bounds.left;
  dragOffsetY = event.clientY - bounds.top;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  didDrag = false;
  document.addEventListener("pointermove", moveDraggedCassette);
  document.addEventListener("pointerup", stopDragging, { once: true });
}

function moveDraggedCassette(event) {
  if (!draggedCassette) return;
  const distance = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
  if (!didDrag && distance < 6) return;

  if (!didDrag) {
    didDrag = true;
    const { cassette, bounds, index } = draggedCassette;
    cassette.classList.add("is-dragging");
    cassetteHitAreas[index].style.visibility = "hidden";
    cassetteOrder = cassetteOrder.filter((cassetteIndex) => cassetteIndex !== index);
    document.body.appendChild(cassette);
    cassette.style.setProperty("position", "fixed", "important");
    cassette.style.setProperty("width", `${bounds.width}px`);
    cassette.style.setProperty("height", `${bounds.height}px`);
    cassette.style.setProperty("left", `${bounds.left}px`);
    cassette.style.setProperty("top", `${bounds.top}px`);
    layoutCassettes();
  }

  draggedCassette.cassette.style.setProperty("left", `${event.clientX - dragOffsetX}px`, "important");
  draggedCassette.cassette.style.setProperty("top", `${event.clientY - dragOffsetY}px`, "important");
}

function stopDragging(event) {
  document.removeEventListener("pointermove", moveDraggedCassette);
  televisionModel.setDropZoneActive(false);
  document.body.classList.remove("is-dragging-cassette");
  if (!draggedCassette) return;

  const { cassette, index } = draggedCassette;
  const wasDrag = didDrag;
  suppressCassetteClick = wasDrag;
  if (!wasDrag) {
    insertCassette(index, false);
    draggedCassette = null;
    didDrag = false;
    return;
  }
  const televisionBounds = televisionDropZone.getBoundingClientRect();
  const droppedOnTelevision = event.clientX >= televisionBounds.left && event.clientX <= televisionBounds.right && event.clientY >= televisionBounds.top && event.clientY <= televisionBounds.bottom;
  if (droppedOnTelevision) {
    insertCassette(index, true);
  } else {
    const startLeft = Number.parseFloat(cassette.style.left) || cassette.getBoundingClientRect().left;
    const startTop = Number.parseFloat(cassette.style.top) || cassette.getBoundingClientRect().top;
    const cassetteWidth = cassette.getBoundingClientRect().width;
    const cassetteHeight = cassette.getBoundingClientRect().height;
    cassetteOrder = cassetteOrder.filter((cassetteIndex) => cassetteIndex !== index);
    cassetteOrder.push(index);
    cassette.classList.remove("is-dragging");
    stack.appendChild(cassette);
    resetCassettePosition(cassette);
    layoutCassettes();
    const targetBounds = cassette.getBoundingClientRect();
    cassette.style.setProperty("position", "fixed", "important");
    cassette.style.setProperty("width", `${cassetteWidth}px`);
    cassette.style.setProperty("height", `${cassetteHeight}px`);
    cassette.style.setProperty("left", `${startLeft}px`, "important");
    cassette.style.setProperty("top", `${startTop}px`, "important");
    animateCassetteToStack(cassette, targetBounds);
  }

  draggedCassette = null;
  didDrag = false;
}

function insertCassette(index, openSheet = true) {
  const previousIndex = insertedCassetteIndex;
  if (previousIndex !== null && previousIndex !== index) {
    const previousCassette = cassetteElements[previousIndex];
    previousCassette.classList.remove("is-inserted");
    resetCassettePosition(previousCassette);
    cassetteOrder = cassetteOrder.filter((cassetteIndex) => cassetteIndex !== previousIndex);
    cassetteOrder.push(previousIndex);
  }

  const cassette = cassetteElements[index];
  cassette.classList.remove("is-dragging");
  cassette.classList.add("is-inserted");
  stack.appendChild(cassette);
  resetCassettePosition(cassette);
  cassetteOrder = cassetteOrder.filter((cassetteIndex) => cassetteIndex !== index);
  insertedCassetteIndex = index;
  layoutCassettes();
  selectProject(index, openSheet, true);
}

function resetCassettePosition(cassette) {
  cassette.style.removeProperty("position");
  cassette.style.removeProperty("width");
  cassette.style.removeProperty("height");
  cassette.style.removeProperty("left");
  cassette.style.removeProperty("top");
  cassette.style.removeProperty("bottom");
  cassette.style.removeProperty("transform");
}

function animateCassetteToStack(cassette, targetBounds) {
  const startLeft = Number.parseFloat(cassette.style.left);
  const startTop = Number.parseFloat(cassette.style.top);
  const fallDistance = Math.max(54, Math.min(110, window.innerHeight * 0.12));
  const fallDuration = 250;
  const settleDuration = 460;
  const startedAt = performance.now();
  cassette.classList.add("is-settling");
  cassette.dataset.settleProgress = "0";

  function animate(now) {
    const elapsed = now - startedAt;
    if (elapsed < fallDuration) {
      const progress = elapsed / fallDuration;
      const easedProgress = progress * progress;
      cassette.dataset.settleProgress = (elapsed / (fallDuration + settleDuration)).toFixed(4);
      cassette.style.setProperty("left", `${startLeft}px`, "important");
      cassette.style.setProperty("top", `${startTop + fallDistance * easedProgress}px`, "important");
      cassette.style.setProperty("transform", `rotate(${(progress * 9).toFixed(2)}deg)`, "important");
      requestAnimationFrame(animate);
      return;
    }

    const settleProgress = Math.min(1, (elapsed - fallDuration) / settleDuration);
    const easedSettle = 1 - Math.pow(1 - settleProgress, 3);
    cassette.dataset.settleProgress = ((fallDuration + elapsed - fallDuration) / (fallDuration + settleDuration)).toFixed(4);
    const settleLeft = startLeft + (targetBounds.left - startLeft) * easedSettle;
    const fallTop = startTop + fallDistance;
    const settleTop = fallTop + (targetBounds.top - fallTop) * easedSettle;
    const bounce = settleProgress < 0.86 ? 0 : Math.sin((settleProgress - 0.86) * Math.PI / 0.14) * 4;
    cassette.style.setProperty("left", `${settleLeft}px`, "important");
    cassette.style.setProperty("top", `${settleTop - bounce}px`, "important");
    cassette.style.setProperty("transform", `rotate(${(9 * (1 - easedSettle)).toFixed(2)}deg)`, "important");

    if (settleProgress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    cassette.classList.remove("is-settling");
    delete cassette.dataset.settleProgress;
    resetCassettePosition(cassette);
    layoutCassettes();
  }

  requestAnimationFrame(animate);
}

function selectProject(index, openSheet = true, animateScreen = true) {
  const project = projects[index];
  televisionModel.update(index, false, animateScreen);
  screenContent.style.opacity = "0";
  setTimeout(() => {
    projectTitle.innerHTML = project.title;
    projectMeta.innerHTML = project.meta;
    projectDescription.textContent = project.description;
    screenContent.style.opacity = "1";
  }, 180);
  document.querySelectorAll(".cassette").forEach((cassette) => {
    const cassetteIndex = Number(cassette.dataset.index);
    cassette.classList.toggle("is-playing", cassetteIndex === index);
    cassette.querySelector(".cassette-label span:last-child").textContent = cassetteIndex === index ? "PLAYING" : "TAPE";
  });
  tapeCount.textContent = `0${index + 1} / 03`;
  if (openSheet) openProjectSheet(index);
}

function openProjectSheet(index) {
  const project = projects[index];
  sheetKicker.textContent = `ARCHIVE / 0${index + 1}`;
  sheetIndex.textContent = `PROJECT 0${index + 1}`;
  sheetTitle.innerHTML = project.title;
  sheetMeta.innerHTML = project.meta;
  sheetLead.textContent = project.lead;
  sheetContent.innerHTML = project.content;
  projectSheet.classList.add("is-visible");
  projectSheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-sheet-open");
}

function closeProjectSheet() {
  projectSheet.classList.remove("is-visible");
  projectSheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-sheet-open");
}

document.querySelectorAll("[data-close-sheet]").forEach((element) => {
  element.addEventListener("click", closeProjectSheet);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProjectSheet();
});

function ejectCassette() {
  const ejectedIndex = insertedCassetteIndex;
  televisionModel.update(0, true);
  screenContent.style.opacity = "0";
  setTimeout(() => {
    projectTitle.innerHTML = "SIGNAL<br>PAUSE";
    projectMeta.textContent = "NO TAPE&nbsp;&nbsp; / &nbsp;&nbsp;READY";
    projectDescription.textContent = "Insérez une cassette pour découvrir un projet.";
    screenContent.style.opacity = "1";
  }, 180);
  document.querySelectorAll(".cassette").forEach((cassette) => {
    cassette.classList.remove("is-playing");
    if (Number(cassette.dataset.index) === ejectedIndex) cassette.classList.remove("is-inserted");
    resetCassettePosition(cassette);
  });
  if (ejectedIndex !== null) {
    cassetteOrder = cassetteOrder.filter((cassetteIndex) => cassetteIndex !== ejectedIndex);
    cassetteOrder.push(ejectedIndex);
  }
  insertedCassetteIndex = null;
  layoutCassettes();
  if (ejectedIndex !== null) cassetteModels.reveal(ejectedIndex);
  tapeCount.textContent = "-- / 03";
}

televisionModel.setEjectHandler(ejectCassette);
televisionModel.setProjectOpenHandler(openProjectSheet);

skillsToggle.addEventListener("click", () => {
  const isOpen = skillsOrbit.classList.toggle("is-open");
  skillsToggle.setAttribute("aria-expanded", String(isOpen));
  skillsToggle.setAttribute("aria-label", isOpen ? "Masquer les langages maîtrisés" : "Afficher les langages maîtrisés");
  if (isOpen) positionSkillBubbles();
});

function positionSkillBubbles() {
  const buttonBounds = skillsToggle.getBoundingClientRect();
  const bubbleSize = window.matchMedia("(max-width: 720px)").matches ? 52 : 58;
  const gap = window.matchMedia("(max-width: 720px)").matches ? 14 : 22;
  const positions = window.matchMedia("(max-width: 720px)").matches
    ? [[0, -104], [47, -86], [78, -42], [70, 10], [34, 49]]
    : [[0, -130], [62, -108], [112, -55], [105, 9], [52, 65]];
  const maxLeft = window.innerWidth - bubbleSize - gap;
  const maxTop = window.innerHeight - bubbleSize - gap;

  skillBubbles.forEach((bubble, index) => {
    const [offsetX, offsetY] = positions[index];
    const left = Math.min(maxLeft, Math.max(gap, buttonBounds.left + offsetX));
    const top = Math.min(maxTop, Math.max(gap, buttonBounds.top + offsetY));
    bubble.style.setProperty("--bubble-left", `${left}px`);
    bubble.style.setProperty("--bubble-top", `${top}px`);
  });
}

window.addEventListener("resize", positionSkillBubbles);