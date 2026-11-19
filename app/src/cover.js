// Vice Panels — the cover renderer. Draws a GTA 6-style multi-panel poster
// (photo panels, sunset/neon grade, bold caption) onto any 2D canvas at any
// export size. Pure canvas, no network, deterministic: the grain is seeded,
// so the same state always draws the same pixels.

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = {
  quad: { label: 'Quad · 2 x 2 panels', panels: 4 },
  hero: { label: 'Hero · big top, two below', panels: 3 },
  strips: { label: 'Strips · three columns', panels: 3 },
  solo: { label: 'Solo · one full photo', panels: 1 },
};

export const GRADES = {
  sunset: { label: 'Sunset' },
  neon: { label: 'Neon nights' },
  noir: { label: 'Noir' },
  none: { label: 'No grade' },
};

export const CAPTION_COLORS = {
  white: { label: 'White' },
  sunset: { label: 'Sunset gradient' },
  neon: { label: 'Neon pink' },
  gold: { label: 'Gold' },
};

/** Returns the panel rectangles (fractions of w/h) for a layout. */
export function layoutRects(w, h, layout) {
  const g = 0.012; // gutter, as a fraction of the short side
  const gw = g * Math.min(w, h);
  const gh = g * Math.min(w, h);
  if (layout === 'quad') {
    const cw = (w - gw * 3) / 2;
    const ch = (h - gh * 3) / 2;
    return [
      { x: gw, y: gh, w: cw, h: ch },
      { x: gw * 2 + cw, y: gh, w: cw, h: ch },
      { x: gw, y: gh * 2 + ch, w: cw, h: ch },
      { x: gw * 2 + cw, y: gh * 2 + ch, w: cw, h: ch },
    ];
  }
  if (layout === 'hero') {
    const topH = (h - gh * 3) * 0.62;
    const botH = h - gh * 3 - topH;
    const cw = (w - gw * 3) / 2;
    return [
      { x: gw, y: gh, w: w - gw * 2, h: topH },
      { x: gw, y: gh * 2 + topH, w: cw, h: botH },
      { x: gw * 2 + cw, y: gh * 2 + topH, w: cw, h: botH },
    ];
  }
  if (layout === 'strips') {
    const cw = (w - gw * 4) / 3;
    return [
      { x: gw, y: gh, w: cw, h: h - gh * 2 },
      { x: gw * 2 + cw, y: gh, w: cw, h: h - gh * 2 },
      { x: gw * 3 + cw * 2, y: gh, w: cw, h: h - gh * 2 },
    ];
  }
  // solo
  return [{ x: gw, y: gh, w: w - gw * 2, h: h - gh * 2 }];
}

function seededNoise(size) {
  // A fixed-seed grain tile, so exports are byte-identical across runs.
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  let seed = 20261119;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

let grainTile = null;
function grain(ctx, w, h) {
  if (!grainTile) grainTile = seededNoise(160);
  const pattern = ctx.createPattern(grainTile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.05;
  try {
    ctx.globalCompositeOperation = 'overlay';
  } catch (_) {
    /* older canvas: plain alpha grain */
  }
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function gradeOverlay(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.10)');
    g.addColorStop(0.55, 'rgba(255, 120, 70, 0.05)');
    g.addColorStop(1, 'rgba(200, 40, 120, 0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255, 45, 150, 0.20)');
    g.addColorStop(0.5, 'rgba(120, 60, 255, 0.06)');
    g.addColorStop(1, 'rgba(0, 220, 255, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else if (grade === 'noir') {
    ctx.fillStyle = 'rgba(8, 8, 18, 0.32)';
    ctx.fillRect(x, y, w, h);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // Vignette on every panel, whatever the grade.
  const v = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.26)');
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
}

function drawPanelPhoto(ctx, rect, photo, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const zoom = panel.zoom || 1;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
    const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
    try {
      ctx.filter = grade === 'noir'
        ? 'grayscale(0.85) contrast(1.08)'
        : 'saturate(1.22) contrast(1.06)';
    } catch (_) {
      /* filter unsupported: draw unfiltered */
    }
    ctx.drawImage(photo, dx, dy, dw, dh);
    try {
      ctx.filter = 'none';
    } catch (_) {
      /* ignore */
    }
  } else {
    // Empty panel: a dusk gradient so the poster never shows a hole.
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `600 ${Math.max(12, Math.round(h * 0.045))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  gradeOverlay(ctx, rect, grade);
  ctx.restore();
  // Thin neon edge around each panel.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.002);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function captionFill(ctx, text, cx, baseline, size, color, w) {
  let fill;
  if (color === 'sunset') {
    const g = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
    g.addColorStop(0, '#ffe259');
    g.addColorStop(0.5, '#ff7e3d');
    g.addColorStop(1, '#ff2d92');
    fill = g;
  } else if (color === 'neon') {
    const g = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
    g.addColorStop(0, '#7df9ff');
    g.addColorStop(0.5, '#ff5ce1');
    g.addColorStop(1, '#ff2d92');
    fill = g;
  } else if (color === 'gold') {
    const g = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.5, '#ffd23d');
    g.addColorStop(1, '#c98a12');
    fill = g;
  } else {
    fill = '#ffffff';
  }
  ctx.font = `900 ${size}px "Arial Black", "Arial Bold", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.04;
  ctx.strokeText(text, cx, baseline);
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, baseline);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** Draws the whole poster for `state` onto `canvas` (sized by the caller). */
export function drawPoster(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  // Poster base: deep dusk purple; the gutters read as part of the design.
  ctx.fillStyle = '#140a1e';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(w, h, state.layout);
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i += 1) {
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photo >= 0 ? photos[panel.photo] || null : null;
    drawPanelPhoto(ctx, rects[i], photo, panel, state.grade);
  }

  // Neon outer frame.
  const frame = ctx.createLinearGradient(0, 0, w, h);
  frame.addColorStop(0, '#ff2d92');
  frame.addColorStop(0.5, '#ff7e3d');
  frame.addColorStop(1, '#00dcff');
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  // Caption band + lettering. The small line stacks clear of the big title:
  // its baseline is set from the title's fitted size, never from a fixed band.
  const caption = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  const atBottom = state.captionPos !== 'top';
  let size = 0;
  if (caption) {
    size = Math.round(w * 0.105 * (state.captionSize || 1));
    ctx.font = `900 ${size}px "Arial Black", "Arial Bold", system-ui, sans-serif`;
    while (ctx.measureText(caption).width > w * 0.88 && size > 14) {
      size -= 2;
      ctx.font = `900 ${size}px "Arial Black", "Arial Bold", system-ui, sans-serif`;
    }
  }
  const subSize = Math.max(12, Math.round(w * 0.028));
  // Band covers the title plus the small line above it (bottom) / below it (top).
  const bandH = h * 0.17 + (sub && caption ? subSize * 1.7 : 0);
  const bandY = atBottom ? h - bandH : 0;
  if (caption || sub) {
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    if (atBottom) {
      band.addColorStop(0, 'rgba(10, 2, 20, 0)');
      band.addColorStop(1, 'rgba(10, 2, 20, 0.62)');
    } else {
      band.addColorStop(0, 'rgba(10, 2, 20, 0.62)');
      band.addColorStop(1, 'rgba(10, 2, 20, 0)');
    }
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);
  }
  const baseline = atBottom ? h - h * 0.045 : bandH - h * 0.02;
  if (sub) {
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`;
    } catch (_) {
      /* letterSpacing unsupported */
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    // Stack the small line as a kicker just clear of the title's cap height.
    const subY = caption
      ? baseline - size * 1.02
      : atBottom ? h - bandH + subSize * 1.5 : bandH - subSize * 1.6;
    ctx.fillText(sub, w / 2, subY);
    try {
      ctx.letterSpacing = '0px';
    } catch (_) {
      /* ignore */
    }
    ctx.shadowBlur = 0;
  }
  if (caption) {
    captionFill(ctx, caption, w / 2, baseline, size, state.captionColor || 'white', w);
  }

  grain(ctx, w, h);
  return rects;
}
