let sourceImg = null;
let markers = {
  leftEye: null,
  rightEye: null,
  mouth: null
};
let currentStep = 0;
const steps = ['leftEye', 'rightEye', 'mouth'];
const stepMessages = [
  'Step 1: Click on the left eye',
  'Step 2: Click on the right eye',
  'Step 3: Click on the mouth'
];
let autoDetectionDone = false;

// face-api model URLs (jsDelivr CDN — no local files needed)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

window.addEventListener('DOMContentLoaded', async () => {
  const photoData = localStorage.getItem('capturedPhoto');

  if (!photoData) {
    document.body.innerHTML = '<div class="container"><h1>No photo found</h1><a href="Illusion.html" class="button">Take a Photo</a></div>';
    return;
  }

  sourceImg = new Image();
  sourceImg.src = photoData;
  sourceImg.onload = async () => {
    initializeCanvas();
    await attemptAutoDetection();
  };
});

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
}

async function attemptAutoDetection() {
  setStatus('Detecting face…', 'info');

  try {
    await loadModels();

    const detection = await faceapi
      .detectSingleFace(sourceImg)
      .withFaceLandmarks();

    if (!detection) {
      setStatus('No face detected — click the eyes and mouth manually.', 'warn');
      enableManualMode();
      return;
    }

    const landmarks = detection.landmarks;

    // face-api returns arrays of points for each feature
    const leftEyePts  = landmarks.getLeftEye();   // user's actual left eye
    const rightEyePts = landmarks.getRightEye();  // user's actual right eye
    const mouthPts    = landmarks.getMouth();

    markers.leftEye  = centroid(leftEyePts);
    markers.rightEye = centroid(rightEyePts);
    markers.mouth    = centroid(mouthPts);

    autoDetectionDone = true;
    currentStep = 3; // skip manual steps

    redrawCanvas();
    setStatus('Face detected! Click "Create Illusion" to continue.', 'success');
    document.getElementById('step-info').textContent = '✓ Eyes and mouth detected automatically';
    document.getElementById('create-btn').disabled = false;

  } catch (err) {
    console.warn('face-api error:', err);
    setStatus('Auto-detection unavailable — click the eyes and mouth manually.', 'warn');
    enableManualMode();
  }
}

/** Average a set of {x, y} landmark points into one centre point */
function centroid(points) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function setStatus(message, type = 'info') {
  let el = document.getElementById('detection-status');
  if (!el) {
    el = document.createElement('p');
    el.id = 'detection-status';
    el.style.cssText = 'margin: 8px 0; font-weight: bold; font-size: 0.95em;';
    const stepInfo = document.getElementById('step-info');
    if (stepInfo) stepInfo.parentNode.insertBefore(el, stepInfo);
  }
  const colours = { info: '#555', warn: '#b8860b', success: '#27ae60', error: '#c0392b' };
  el.style.color = colours[type] || '#555';
  el.textContent = message;
}

function enableManualMode() {
  const canvas = document.getElementById('interactive-canvas');
  canvas.addEventListener('click', handleCanvasClick);
  document.getElementById('step-info').textContent = stepMessages[0];
}

function initializeCanvas() {
  const canvas = document.getElementById('interactive-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = sourceImg.naturalWidth;
  canvas.height = sourceImg.naturalHeight;
  ctx.drawImage(sourceImg, 0, 0);

  document.getElementById('reset-btn').addEventListener('click', resetMarkers);
  document.getElementById('create-btn').addEventListener('click', createIllusion);

  // Manual click listener is added only as fallback (see enableManualMode)
}

function handleCanvasClick(event) {
  if (autoDetectionDone) return; // ignore clicks after auto-detection

  const canvas = document.getElementById('interactive-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top)  * scaleY;

  const stepName = steps[currentStep];
  markers[stepName] = { x: canvasX, y: canvasY };

  redrawCanvas();

  currentStep++;
  if (currentStep < 3) {
    document.getElementById('step-info').textContent = stepMessages[currentStep];
  } else {
    document.getElementById('step-info').textContent = '✓ All marked! Click "Create Illusion" to see the effect';
    document.getElementById('create-btn').disabled = false;
  }
}

function redrawCanvas() {
  const canvas = document.getElementById('interactive-canvas');
  const ctx = canvas.getContext('2d');

  ctx.drawImage(sourceImg, 0, 0);

  if (markers.leftEye)  drawMarker(ctx, markers.leftEye.x,  markers.leftEye.y,  '#e74c3c', 'L');
  if (markers.rightEye) drawMarker(ctx, markers.rightEye.x, markers.rightEye.y, '#3498db', 'R');
  if (markers.mouth)    drawMarker(ctx, markers.mouth.x,    markers.mouth.y,    '#2ecc71', 'M');
}

function drawMarker(ctx, x, y, color, label) {
  const radius = 25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
}

function resetMarkers() {
  markers = { leftEye: null, rightEye: null, mouth: null };
  currentStep = 0;
  autoDetectionDone = false;

  const canvas = document.getElementById('interactive-canvas');

  // Re-attempt auto-detection on reset
  setStatus('', 'info');
  document.getElementById('step-info').textContent = stepMessages[0];
  document.getElementById('create-btn').disabled = true;
  redrawCanvas();

  // Remove old manual listener before potentially re-adding it
  canvas.removeEventListener('click', handleCanvasClick);

  attemptAutoDetection();
}

function createIllusion() {
  const offscreen = document.createElement('canvas');
  offscreen.width = sourceImg.naturalWidth;
  offscreen.height = sourceImg.naturalHeight;
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(sourceImg, 0, 0);

  const eyeDistance = Math.abs(markers.rightEye.x - markers.leftEye.x);
  flipFeatureVertically(offCtx, markers.leftEye.x,  markers.leftEye.y,  eyeDistance / 3, eyeDistance / 3);
  flipFeatureVertically(offCtx, markers.rightEye.x, markers.rightEye.y, eyeDistance / 3, eyeDistance / 3);
  flipFeatureVertically(offCtx, markers.mouth.x,    markers.mouth.y,    eyeDistance / 2, eyeDistance / 4);

  window._thatcherCanvas = offscreen;

  createVersion('canvas-original',        false, false);
  createVersion('canvas-features-flipped', false, true);
  createVersion('canvas-upside-down',      true,  false);
  createVersion('canvas-both',             true,  true);

  document.getElementById('results-section').classList.add('show');
}

function createVersion(canvasId, flipImage, invertFeatures) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width  = sourceImg.naturalWidth;
  const height = sourceImg.naturalHeight;

  canvas.width  = width;
  canvas.height = height;

  const src = invertFeatures ? window._thatcherCanvas : sourceImg;

  if (flipImage) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(src, -width / 2, -height / 2);
    ctx.restore();
  } else {
    ctx.drawImage(src, 0, 0);
  }
}

function flipFeatureVertically(ctx, centerX, centerY, radiusX, radiusY) {
  const startX = Math.max(0, Math.floor(centerX - radiusX));
  const endX   = Math.min(sourceImg.naturalWidth,  Math.ceil(centerX + radiusX));
  const startY = Math.max(0, Math.floor(centerY - radiusY));
  const endY   = Math.min(sourceImg.naturalHeight, Math.ceil(centerY + radiusY));

  const width  = endX - startX;
  const height = endY - startY;
  if (width <= 0 || height <= 0) return;

  const imageData = ctx.getImageData(startX, startY, width, height);
  const data = imageData.data;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < Math.floor(height / 2); y++) {
      const topIdx    = (y * width + x) * 4;
      const bottomIdx = ((height - 1 - y) * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const temp = data[topIdx + c];
        data[topIdx + c] = data[bottomIdx + c];
        data[bottomIdx + c] = temp;
      }
    }
  }

  ctx.putImageData(imageData, startX, startY);
}
