const glow = document.querySelector('.cursor-glow');
const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project-card');
const modal = document.querySelector('.project-modal');
const modalTitle = document.querySelector('#modal-title');
const modalType = document.querySelector('#modal-type');
const modalCopy = document.querySelector('#modal-copy');
const modalYear = document.querySelector('#modal-year');
const modalRole = document.querySelector('#modal-role');
const modalClose = document.querySelector('.modal-close');

const projectDetails = {
  atelier: { title: 'Atlas Obscura', type: 'WEB DESIGN / 2025', copy: 'Une exploration éditoriale des lieux qui échappent aux cartes. Direction artistique, interface et développement d\'une expérience qui se parcourt comme un carnet de terrain.', year: '2025', role: 'ART DIRECTION / FRONT-END' },
  morrow: { title: 'Morrow Studio', type: 'IDENTITÉ / 2024', copy: 'Une identité solaire pour une maison qui imagine les objets de demain. Le système visuel traduit la chaleur, la matière et la durabilité.', year: '2024', role: 'BRAND IDENTITY / DIGITAL' },
  signal: { title: 'Signal / Noise', type: 'CREATIVE CODE / 2024', copy: 'Un instrument visuel qui donne une forme aux fréquences. Une expérience générative construite autour du son, du mouvement et de l\'attention.', year: '2024', role: 'CREATIVE DEVELOPMENT' },
  arc: { title: 'Arc / Studio', type: 'DIRECTION ARTISTIQUE / 2023', copy: 'Le site d\'un collectif qui pense avec les mains. Une plateforme simple, tactile et éditoriale pour donner à voir leur manière de travailler.', year: '2023', role: 'ART DIRECTION / UI DESIGN' }
};

document.addEventListener('mousemove', (event) => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    const selected = filter.dataset.filter;
    filters.forEach((item) => {
      item.classList.toggle('active', item === filter);
      item.setAttribute('aria-selected', item === filter ? 'true' : 'false');
    });
    projects.forEach((project) => {
      project.hidden = selected !== 'all' && project.dataset.category !== selected;
    });
  });
});

function openProject(key) {
  const detail = projectDetails[key];
  if (!detail) return;
  modalTitle.textContent = detail.title;
  modalType.textContent = detail.type;
  modalCopy.textContent = detail.copy;
  modalYear.textContent = detail.year;
  modalRole.textContent = detail.role;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeProject() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

projects.forEach((project) => project.addEventListener('click', () => openProject(project.dataset.project)));
modalClose.addEventListener('click', closeProject);
modal.querySelector('.modal-backdrop').addEventListener('click', closeProject);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeProject();
});
