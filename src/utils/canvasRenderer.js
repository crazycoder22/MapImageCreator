const W = 1200;
const H = 1600;

const THEME = {
  bg1: '#0d1117',
  bg2: '#161b22',
  accent: '#ff6b35',
  accentGlow: 'rgba(255, 107, 53, 0.35)',
  accentSoft: 'rgba(255, 107, 53, 0.12)',
  white: '#ffffff',
  muted: '#8b949e',
  divider: 'rgba(255, 255, 255, 0.06)',
  dot: 'rgba(255, 255, 255, 0.015)',
  labelBg: 'rgba(13, 17, 23, 0.88)',
  success: '#3fb950',
};

// --- Projection helpers ---

function computeProjection(coords, area) {
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);

  const geoW = (maxLng - minLng) * cosLat;
  const geoH = maxLat - minLat;

  if (geoW === 0 && geoH === 0) {
    return { offsetX: area.x + area.width / 2, offsetY: area.y + area.height / 2, isPoint: true };
  }

  const scaleX = geoW > 0 ? area.width / geoW : Infinity;
  const scaleY = geoH > 0 ? area.height / geoH : Infinity;
  const scale = Math.min(scaleX, scaleY) * 0.82;

  const projW = geoW * scale;
  const projH = geoH * scale;

  return {
    scale,
    offsetX: area.x + (area.width - projW) / 2,
    offsetY: area.y + (area.height - projH) / 2,
    minLng,
    maxLat,
    cosLat,
    isPoint: false,
  };
}

function project(coord, proj) {
  if (proj.isPoint) return { x: proj.offsetX, y: proj.offsetY };
  return {
    x: proj.offsetX + (coord[0] - proj.minLng) * proj.cosLat * proj.scale,
    y: proj.offsetY + (proj.maxLat - coord[1]) * proj.scale,
  };
}

function downsample(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  const result = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

// --- Drawing functions ---

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, THEME.bg1);
  grad.addColorStop(1, THEME.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = THEME.dot;
  for (let x = 0; x < W; x += 24) {
    for (let y = 0; y < H; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDivider(ctx, y) {
  ctx.strokeStyle = THEME.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, y);
  ctx.lineTo(W - 80, y);
  ctx.stroke();
}

function drawHeader(ctx, title, clubName) {
  ctx.textAlign = 'center';

  if (clubName) {
    ctx.fillStyle = THEME.muted;
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillText(clubName.toUpperCase(), W / 2, 55);
  }

  ctx.fillStyle = THEME.white;
  ctx.font = 'bold 44px Inter, system-ui, sans-serif';
  ctx.fillText(title || 'Cycling Route', W / 2, clubName ? 105 : 80);

  drawDivider(ctx, 135);
}

function drawRouteLine(ctx, points) {
  if (points.length < 2) return;

  // Glow
  ctx.save();
  ctx.strokeStyle = THEME.accentGlow;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // Main line
  ctx.save();
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMarkers(ctx, waypoints) {
  ctx.textAlign = 'center';

  waypoints.forEach((wp, i) => {
    const { x, y, name } = wp;

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = THEME.accent;
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = THEME.white;
    ctx.fill();

    // Label
    const label = name || `Point ${i + 1}`;
    const shortLabel = label.length > 35 ? label.substring(0, 32) + '...' : label;

    ctx.font = '600 14px Inter, system-ui, sans-serif';
    const metrics = ctx.measureText(shortLabel);
    const labelW = metrics.width + 18;
    const labelH = 28;
    const labelX = x - labelW / 2;
    const labelY = y - 32;

    // Label background
    roundRect(ctx, labelX, labelY, labelW, labelH, 6);
    ctx.fillStyle = THEME.labelBg;
    ctx.fill();
    ctx.strokeStyle = THEME.accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label text
    ctx.fillStyle = THEME.white;
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText(shortLabel, x, labelY + 18);
  });
}

function drawElevation(ctx, coords, area) {
  const sampled = downsample(coords, 300);
  const elevations = sampled.map(c => c[2] || 0);
  if (elevations.every(e => e === 0)) return;

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  // Section label
  ctx.fillStyle = THEME.muted;
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ELEVATION PROFILE', area.x, area.y - 12);

  // Min/max labels
  ctx.textAlign = 'right';
  ctx.font = '400 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = THEME.muted;
  ctx.fillText(`${Math.round(maxElev)}m`, area.x - 10, area.y + 12);
  ctx.fillText(`${Math.round(minElev)}m`, area.x - 10, area.y + area.height);

  const points = elevations.map((e, i) => ({
    x: area.x + (i / (elevations.length - 1)) * area.width,
    y: area.y + area.height - ((e - minElev) / elevRange) * area.height,
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(points[0].x, area.y + area.height);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(points[points.length - 1].x, area.y + area.height);
  ctx.closePath();
  ctx.fillStyle = THEME.accentSoft;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawStats(ctx, routeData, y) {
  drawDivider(ctx, y);

  const statsY = y + 50;

  const { distance, duration, ascent } = routeData;

  const distStr =
    distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;

  const hours = Math.floor(duration / 3600);
  const mins = Math.floor((duration % 3600) / 60);
  const durStr = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

  const ascentStr = `${Math.round(ascent)} m`;

  const stats = [
    { label: 'DISTANCE', value: distStr },
    { label: 'ELEVATION GAIN', value: ascentStr },
    { label: 'EST. DURATION', value: durStr },
  ];

  const colWidth = (W - 160) / stats.length;

  stats.forEach((stat, i) => {
    const x = 80 + colWidth * i + colWidth / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = THEME.muted;
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillText(stat.label, x, statsY);

    ctx.fillStyle = THEME.white;
    ctx.font = 'bold 30px Inter, system-ui, sans-serif';
    ctx.fillText(stat.value, x, statsY + 40);
  });
}

function drawWatermark(ctx) {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.font = '400 13px Inter, system-ui, sans-serif';
  ctx.fillText('Made with Cycling Route Map Creator', W / 2, H - 40);
}

// --- Main export ---

export function renderRoute(canvas, routeData, waypoints, options = {}) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  const { title, clubName } = options;

  // Layout regions
  const routeArea = { x: 80, y: 160, width: W - 160, height: 840 };
  const elevArea = { x: 100, y: 1080, width: W - 200, height: 180 };
  const statsY = 1300;

  // Compute projection using all coordinates (route + waypoints)
  const allCoords = [
    ...routeData.coordinates,
    ...waypoints.filter(w => w.coordinates).map(w => w.coordinates),
  ];
  const proj = computeProjection(allCoords, routeArea);

  // Project route points (downsample for performance)
  const sampledRoute = downsample(routeData.coordinates, 2000);
  const projectedRoute = sampledRoute.map(c => project(c, proj));

  // Project waypoints
  const projectedWaypoints = waypoints
    .filter(w => w.coordinates)
    .map(w => ({ ...project(w.coordinates, proj), name: w.name }));

  // Render
  drawBackground(ctx);
  drawHeader(ctx, title, clubName);
  drawRouteLine(ctx, projectedRoute);
  drawMarkers(ctx, projectedWaypoints);
  drawDivider(ctx, 1050);
  drawElevation(ctx, routeData.coordinates, elevArea);
  drawStats(ctx, routeData, statsY);
  drawWatermark(ctx);
}

export function downloadCanvas(canvas, filename = 'cycling-route.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
