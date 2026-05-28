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

window.addEventListener('DOMContentLoaded', () => {
  const photoData = localStorage.getItem('capturedPhoto');

  if (!photoData) {
    document.body.innerHTML = '<div class="container"><h1>No photo found</h1><a href="Illusion.html" class="button">Take a Photo</a></div>';
    return;
  }

  sourceImg = new Image();
  sourceImg.src = photoData;
  sourceImg.onload = () => {
    initializeCanvas();
  };
});

function initializeCanvas() {
  const canvas = document.getElementById('interactive-canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size to match image
  canvas.width = sourceImg.naturalWidth;
  canvas.height = sourceImg.naturalHeight;

  // Draw image
  ctx.drawImage(sourceImg, 0, 0);

  // Add click listener
  canvas.addEventListener('click', handleCanvasClick);

  // Add button listeners
  document.getElementById('reset-btn').addEventListener('click', resetMarkers);
  document.getElementById('create-btn').addEventListener('click', createIllusion);
}

function handleCanvasClick(event) {
  const canvas = document.getElementById('interactive-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Scale to canvas coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = x * scaleX;
  const canvasY = y * scaleY;

  // Store marker
  const stepName = steps[currentStep];
  markers[stepName] = { x: canvasX, y: canvasY };

  // Draw markers
  redrawCanvas();

  // Move to next step
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

  // Redraw image
  ctx.drawImage(sourceImg, 0, 0);

  // Draw markers
  if (markers.leftEye) {
    drawMarker(ctx, markers.leftEye.x, markers.leftEye.y, '#e74c3c', 'L');
  }
  if (markers.rightEye) {
    drawMarker(ctx, markers.rightEye.x, markers.rightEye.y, '#3498db', 'R');
  }
  if (markers.mouth) {
    drawMarker(ctx, markers.mouth.x, markers.mouth.y, '#2ecc71', 'M');
  }
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
  markers = {
    leftEye: null,
    rightEye: null,
    mouth: null
  };
  currentStep = 0;
  document.getElementById('step-info').textContent = stepMessages[0];
  document.getElementById('create-btn').disabled = true;
  redrawCanvas();
}

function createIllusion() {
  // Create the Thatcher-effected image data once and cache it
  const offscreen = document.createElement('canvas');
  offscreen.width = sourceImg.naturalWidth;
  offscreen.height = sourceImg.naturalHeight;
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(sourceImg, 0, 0);

  const eyeDistance = Math.abs(markers.rightEye.x - markers.leftEye.x);
  flipFeatureVertically(offCtx, markers.leftEye.x, markers.leftEye.y, eyeDistance / 3, eyeDistance / 3);
  flipFeatureVertically(offCtx, markers.rightEye.x, markers.rightEye.y, eyeDistance / 3, eyeDistance / 3);
  flipFeatureVertically(offCtx, markers.mouth.x, markers.mouth.y, eyeDistance / 2, eyeDistance / 4);

  // Cache as an ImageBitmap or just the canvas element
  window._thatcherCanvas = offscreen;

  createVersion('canvas-original', false, false);
  createVersion('canvas-features-flipped', false, true);
  createVersion('canvas-upside-down', true, false);
  createVersion('canvas-both', true, true);

  document.getElementById('results-section').classList.add('show');
}

function createVersion(canvasId, flipImage, invertFeatures) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width = sourceImg.naturalWidth;
  const height = sourceImg.naturalHeight;

  canvas.width = width;
  canvas.height = height;

  // Pick the right source: Thatcher version or original
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
  // No per-feature flipping needed here anymore
}

function flipFeatureVertically(ctx, centerX, centerY, radiusX, radiusY) {
  const startX = Math.max(0, Math.floor(centerX - radiusX));
  const endX = Math.min(sourceImg.naturalWidth, Math.ceil(centerX + radiusX));
  const startY = Math.max(0, Math.floor(centerY - radiusY));
  const endY = Math.min(sourceImg.naturalHeight, Math.ceil(centerY + radiusY));

  const width = endX - startX;
  const height = endY - startY;

  if (width <= 0 || height <= 0) return;

  const imageData = ctx.getImageData(startX, startY, width, height);
  const data = imageData.data;

  // Flip vertically (mirror top-bottom)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < Math.floor(height / 2); y++) {
      const topIdx = (y * width + x) * 4;
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

function downloadImage(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function shareToInstagram(canvasId, title) {
  const canvas = document.getElementById(canvasId);
  canvas.toBlob((blob) => {
    const file = new File([blob], `${title}.png`, { type: 'image/png' });

    if (navigator.share) {
      navigator.share({
        files: [file],
        title: title,
        text: 'Check out my Thatcher Illusion!'
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.log('Share error:', err);
          fallbackShare(canvasId, title);
        }
      });
    } else {
      fallbackShare(canvasId, title);
    }
  }, 'image/png');
}

function fallbackShare(canvasId, title) {
  const canvas = document.getElementById(canvasId);
  const dataUrl = canvas.toDataURL('image/png');

  // Create temporary link and download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${title}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert('Image downloaded! Now open Instagram and upload it from your photos.');
}
