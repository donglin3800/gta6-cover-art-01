// Vice Panels — wires the editor: photos in, layout/size/grade/caption controls,
// live preview with click-to-select + drag-to-pan + wheel-to-zoom, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawPoster, EXPORT_SIZES, LAYOUTS, GRADES, CAPTION_COLORS, layoutRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

export const state = {
  size: '1080x1080',
  layout: 'quad',
  grade: 'sunset',
  caption: 'Sunset Heist',
  subcaption: 'Neon Coast · 2026',
  captionColor: 'sunset',
  captionPos: 'bottom',
  captionSize: 1,
  panels: [
    { photo: 0, zoom: 1.15, ox: 0, oy: 0 },
    { photo: 1, zoom: 1.15, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.3, ox: 0.05, oy: 0 },
    { photo: 1, zoom: 1.3, ox: -0.05, oy: 0 },
  ],
};

export const photos = []; // { img, name }
let selectedPanel = 0;
let lastRects = [];

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

export function redraw() {
  const size = EXPORT_SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  lastRects = drawPoster(canvas, state, photos.map((p) => p.img));
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  document.getElementById('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${LAYOUTS[state.layout].panels}`;
  const sel = document.getElementById('panelPhoto');
  // Build options with DOM APIs, not innerHTML: photo names come from user
  // file names, and a crafted name must never parse as markup.
  sel.replaceChildren();
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'No photo';
  sel.appendChild(none);
  photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    if (panel.photo === i) o.selected = true;
    sel.appendChild(o);
  });
  document.getElementById('zoom').value = panel.zoom;
  document.getElementById('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('panX').value = panel.ox;
  document.getElementById('panY').value = panel.oy;
  document.querySelectorAll('#panelList button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === selectedPanel);
  });
}

function buildPanelList() {
  const list = document.getElementById('panelList');
  const count = LAYOUTS[state.layout].panels;
  list.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.panel = String(i);
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelControls();
      redraw();
    });
    list.appendChild(b);
  }
  if (selectedPanel >= count) selectedPanel = 0;
  syncPanelControls();
}

function buildOptionButtons(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, value]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = value.label;
    if (key === current) b.classList.add('active');
    b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      onPick(key);
    });
    box.appendChild(b);
  });
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  photos.push({ img, name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo' });
  return photos.length - 1;
}

async function loadSamples() {
  for (const [name, file] of [['Boulevard', 'samples/boulevard.jpg'], ['Pier', 'samples/pier.jpg']]) {
    if (photos.some((p) => p.name === name)) continue;
    const img = await loadImage(file);
    photos.push({ img, name });
  }
  state.panels[0].photo = photos.findIndex((p) => p.name === 'Boulevard');
  state.panels[1].photo = photos.findIndex((p) => p.name === 'Pier');
  state.panels[2].photo = photos.findIndex((p) => p.name === 'Pier');
  state.panels[3].photo = photos.findIndex((p) => p.name === 'Boulevard');
  buildPanelList();
  redraw();
  setStatus('Sample photos loaded. Pick a panel, then crop and position it.');
}

// --- Controls ---
document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    try {
      await addPhotoFile(file);
    } catch (_) {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  // New photos fill empty panels first.
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i += 1) {
    if (state.panels[i].photo < 0 && photos.length) state.panels[i].photo = photos.length - 1;
  }
  buildPanelList();
  redraw();
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded.`);
});
document.getElementById('loadSamples').addEventListener('click', () => {
  loadSamples().catch(() => setStatus('Could not load the sample photos.'));
});

buildOptionButtons('layoutRow', LAYOUTS, state.layout, (key) => {
  state.layout = key;
  buildPanelList();
  redraw();
});
buildOptionButtons('gradeRow', GRADES, state.grade, (key) => {
  state.grade = key;
  redraw();
});
buildOptionButtons('colorRow', CAPTION_COLORS, state.captionColor, (key) => {
  state.captionColor = key;
  redraw();
});

const sizeSelect = document.getElementById('sizeSelect');
Object.entries(EXPORT_SIZES).forEach(([key, value]) => {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = value.label;
  sizeSelect.appendChild(o);
});
sizeSelect.value = state.size;
sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  redraw();
});

const captionInput = document.getElementById('captionInput');
captionInput.value = state.caption;
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
const subInput = document.getElementById('subInput');
subInput.value = state.subcaption;
subInput.addEventListener('input', () => {
  state.subcaption = subInput.value;
  redraw();
});
document.getElementById('captionPos').addEventListener('click', (e) => {
  state.captionPos = state.captionPos === 'bottom' ? 'top' : 'bottom';
  e.currentTarget.textContent = state.captionPos === 'bottom' ? 'Caption: bottom' : 'Caption: top';
  redraw();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  document.getElementById('captionSizeVal').textContent = `${Math.round(state.captionSize * 100)}%`;
  redraw();
});

document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panels[selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  document.getElementById('zoomVal').textContent = `${Math.round(state.panels[selectedPanel].zoom * 100)}%`;
  redraw();
});
document.getElementById('panX').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('panY').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  state.panels[selectedPanel] = { photo: state.panels[selectedPanel].photo, zoom: 1.15, ox: 0, oy: 0 };
  syncPanelControls();
  redraw();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed in this browser.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${state.size}.png`;
    a.click();
    setStatus(`Saved vice-panels-${state.size}.png (${canvas.width} x ${canvas.height}).`);
  }, 'image/png');
});

// --- Preview interaction: click selects a panel, drag pans it, wheel zooms it. ---
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(x, y) {
  const rects = lastRects.length ? lastRects : layoutRects(canvas.width, canvas.height, state.layout);
  for (let i = 0; i < rects.length; i += 1) {
    const rc = rects[i];
    if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectedPanel = i;
  syncPanelControls();
  drag = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy, w: canvas.width, h: canvas.height };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[selectedPanel];
  const rect = lastRects[selectedPanel];
  if (!rect) return;
  panel.ox = Math.max(-0.6, Math.min(0.6, drag.ox + (p.x - drag.x) / rect.w));
  panel.oy = Math.max(-0.6, Math.min(0.6, drag.oy + (p.y - drag.y) / rect.h));
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectedPanel = i;
  const panel = state.panels[i];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  syncPanelControls();
  redraw();
}, { passive: false });

// --- Shot scenes (deterministic screenshots) ---
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { loadImage, loadSamples, state, photos, redraw, setStatus });
} else {
  buildPanelList();
  loadSamples().catch(() => {
    buildPanelList();
    redraw();
  });
}
