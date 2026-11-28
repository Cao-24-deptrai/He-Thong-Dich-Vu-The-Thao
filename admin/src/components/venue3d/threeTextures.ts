import * as THREE from 'three';

export function createSoccerGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const stripes = 8;
  const stripeW = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#166534' : '#15803d';
    ctx.fillRect(i * stripeW, 0, stripeW, canvas.height);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 8;
  const margin = 30;
  ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, margin);
  ctx.lineTo(canvas.width / 2, canvas.height - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeRect(margin, canvas.height / 2 - 120, 140, 240);
  ctx.strokeRect(canvas.width - margin - 140, canvas.height / 2 - 120, 140, 240);

  ctx.strokeRect(margin, canvas.height / 2 - 60, 50, 120);
  ctx.strokeRect(canvas.width - margin - 50, canvas.height / 2 - 60, 50, 120);

  ctx.beginPath();
  ctx.arc(margin + 90, canvas.height / 2, 5, 0, Math.PI * 2);
  ctx.arc(canvas.width - margin - 90, canvas.height / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(margin, margin, 16, 0, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(margin, canvas.height - margin, 16, -Math.PI / 2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width - margin, margin, 16, Math.PI / 2, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width - margin, canvas.height - margin, 16, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export function createBadmintonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#044e39';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const marginX = 40;
  const marginY = 35;
  const courtW = canvas.width - marginX * 2;
  const courtH = canvas.height - marginY * 2;

  ctx.fillStyle = '#065f46';
  ctx.fillRect(marginX, marginY, courtW, courtH);

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.strokeRect(marginX, marginY, courtW, courtH);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, marginY + 24);
  ctx.lineTo(marginX + courtW, marginY + 24);
  ctx.moveTo(marginX, marginY + courtH - 24);
  ctx.lineTo(marginX + courtW, marginY + courtH - 24);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, marginY);
  ctx.lineTo(canvas.width / 2, marginY + courtH);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 65, marginY);
  ctx.lineTo(canvas.width / 2 - 65, marginY + courtH);
  ctx.moveTo(canvas.width / 2 + 65, marginY);
  ctx.lineTo(canvas.width / 2 + 65, marginY + courtH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(marginX + 26, marginY);
  ctx.lineTo(marginX + 26, marginY + courtH);
  ctx.moveTo(marginX + courtW - 26, marginY);
  ctx.lineTo(marginX + courtW - 26, marginY + courtH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(marginX, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 - 65, canvas.height / 2);
  ctx.moveTo(canvas.width / 2 + 65, canvas.height / 2);
  ctx.lineTo(marginX + courtW, canvas.height / 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export function createTennisTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#047857';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const insetX = 45;
  const insetY = 35;
  const w = canvas.width - insetX * 2;
  const h = canvas.height - insetY * 2;
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(insetX, insetY, w, h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(insetX, insetY, w, h);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(insetX, insetY + 25);
  ctx.lineTo(insetX + w, insetY + 25);
  ctx.moveTo(insetX, insetY + h - 25);
  ctx.lineTo(insetX + w, insetY + h - 25);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, insetY - 8);
  ctx.lineTo(canvas.width / 2, insetY + h + 8);
  ctx.stroke();

  const serviceBoxW = 125;
  const serviceTop = insetY + 25;
  const serviceH = h - 50;

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - serviceBoxW, serviceTop);
  ctx.lineTo(canvas.width / 2 - serviceBoxW, serviceTop + serviceH);
  ctx.moveTo(canvas.width / 2 + serviceBoxW, serviceTop);
  ctx.lineTo(canvas.width / 2 + serviceBoxW, serviceTop + serviceH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - serviceBoxW, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 + serviceBoxW, canvas.height / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(insetX, canvas.height / 2);
  ctx.lineTo(insetX + 10, canvas.height / 2);
  ctx.moveTo(insetX + w, canvas.height / 2);
  ctx.lineTo(insetX + w - 10, canvas.height / 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#06140c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = 0; x <= canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function createBasketballTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 28;
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = margin * 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, margin);
  ctx.lineTo(canvas.width / 2, canvas.height - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
  ctx.stroke();

  [margin, canvas.width - margin].forEach((_xEnd, idx) => {
    const isLeft = idx === 0;
    const keyW = 150;
    const keyH = 120;
    const keyX = isLeft ? margin : canvas.width - margin - keyW;
    const keyY = canvas.height / 2 - keyH / 2;

    ctx.fillStyle = 'rgba(30, 58, 138, 0.4)';
    ctx.fillRect(keyX, keyY, keyW, keyH);
    ctx.strokeRect(keyX, keyY, keyW, keyH);

    ctx.beginPath();
    const circleCenterX = isLeft ? margin + keyW : canvas.width - margin - keyW;
    ctx.arc(circleCenterX, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    const arcCenterX = isLeft ? margin + 45 : canvas.width - margin - 45;
    ctx.arc(
      arcCenterX,
      canvas.height / 2,
      160,
      isLeft ? -Math.PI / 2.3 : Math.PI - Math.PI / 2.3,
      isLeft ? Math.PI / 2.3 : Math.PI + Math.PI / 2.3
    );
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createSwimmingPoolTexture(isOlympic: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = isOlympic ? 1024 : 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isOlympic ? '#0284c7' : '#06b6d4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  const tileSize = 16;
  for (let x = 0; x <= canvas.width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const numLanes = isOlympic ? 8 : 5;
  const laneW = canvas.width / numLanes;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.lineWidth = 8;
  for (let i = 0; i < numLanes; i++) {
    const laneCenterX = i * laneW + laneW / 2;
    ctx.beginPath();
    ctx.moveTo(laneCenterX, 40);
    ctx.lineTo(laneCenterX, canvas.height - 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(laneCenterX - 25, 60);
    ctx.lineTo(laneCenterX + 25, 60);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(laneCenterX - 25, canvas.height - 60);
    ctx.lineTo(laneCenterX + 25, canvas.height - 60);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
