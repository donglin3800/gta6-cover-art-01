// Fixed scenes for screenshots and self-tests.
//   ?shot=cover&layout=quad&size=1920x1080&caption=Sunset%20Heist
//       draws the cover alone, full viewport, sample photos loaded.
//   ?shot=editor&layout=hero&size=1080x1350&caption=Boulevard%20Queen
//       shows the editor UI with a photo loaded.
//   ?shot=selftest
//       draws all three export sizes offscreen and reports their pixel sizes
//       into a <pre id="selftest"> in the DOM, for headless verification.
// window.__shotReady is set once painted.
import { drawPoster, EXPORT_SIZES, LAYOUTS } from './cover.js';

function applyQuery(query, state) {
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('size') && EXPORT_SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption') !== null) state.caption = query.get('caption');
  if (query.get('sub') !== null) state.subcaption = query.get('sub');
  if (query.get('color')) state.captionColor = query.get('color');
  if (query.get('pos')) state.captionPos = query.get('pos');
}

function paintDone() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, ctx) {
  const { loadImage, loadSamples, state, photos, redraw } = ctx;
  applyQuery(query, state);
  if (shot === 'selftest') {
    await loadSamples();
    const lines = [];
    for (const [key, size] of Object.entries(EXPORT_SIZES)) {
      state.size = key;
      const off = document.createElement('canvas');
      off.width = size.w;
      off.height = size.h;
      drawPoster(off, state, photos.map((p) => p.img));
      // Pixel probes inside the first panel (not the gutter cross): a drawn
      // photo reads far from the poster's bare base colour (20,10,30).
      const probe = off.getContext('2d')
        .getImageData(Math.floor(size.w * 0.25), Math.floor(size.h * 0.25), 1, 1).data;
      const base = Math.abs(probe[0] - 20) + Math.abs(probe[1] - 10) + Math.abs(probe[2] - 30);
      // The export path itself: the same canvas must turn into a real PNG blob.
      const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
      lines.push(`${key} ${off.width}x${off.height} panel1 rgba(${probe[0]},${probe[1]},${probe[2]},${probe[3]}) baseDist=${base} pngBlob=${blob ? blob.size : 0}`);
    }
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = lines.join('\n');
    document.body.appendChild(pre);
    window.__shotReady = true;
    return;
  }
  await loadSamples();
  // Per-panel photo picks from the query, e.g. photos=0,1,0,1.
  const picks = (query.get('photos') || '').split(',').filter((s) => s !== '');
  picks.forEach((pick, i) => {
    if (state.panels[i]) state.panels[i].photo = Number(pick);
  });
  const captionInput = document.getElementById('captionInput');
  if (captionInput) captionInput.value = state.caption;
  const subInput = document.getElementById('subInput');
  if (subInput) subInput.value = state.subcaption;
  const sizeSelect = document.getElementById('sizeSelect');
  if (sizeSelect) sizeSelect.value = state.size;
  const posBtn = document.getElementById('captionPos');
  if (posBtn) posBtn.textContent = state.captionPos === 'bottom' ? 'Caption: bottom' : 'Caption: top';
  // Keep the editor's chip buttons honest about the scene's state.
  for (const [id, value] of [['layoutRow', state.layout], ['gradeRow', state.grade], ['colorRow', state.captionColor]]) {
    const row = document.getElementById(id);
    if (!row) continue;
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.value === value));
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // Rebuild the panel list for the chosen layout, then draw.
  const list = document.getElementById('panelList');
  if (list) {
    list.innerHTML = '';
    for (let i = 0; i < LAYOUTS[state.layout].panels; i += 1) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Panel ${i + 1}`;
      if (i === 0) b.classList.add('active');
      list.appendChild(b);
    }
  }
  redraw();
  // Keep the editor visible for editor shots; cover shots hide the controls
  // with the shot-cover class in CSS.
  paintDone();
}
