let video = null;
let captureButton = null;
let statusElement = null;
let uploadStatus = null;
let fileInput = null;
let uploadArea = null;

window.addEventListener('DOMContentLoaded', () => {
  video = document.querySelector('.Video');
  captureButton = document.querySelector('.Capture');
  statusElement = document.getElementById('camera-status');
  uploadStatus = document.getElementById('upload-status');
  fileInput = document.getElementById('file-input');
  uploadArea = document.getElementById('upload-area');

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Update active button and content
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');

      // Initialize camera only when camera tab is shown
      if (tabName === 'camera' && !video.srcObject) {
        initCamera();
      }
    });
  });

  // Initialize camera on load
  if (video) {
    initCamera();
  }

  // Capture button
  if (captureButton) {
    captureButton.addEventListener('click', captureImage);
  }

  // File upload handlers
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
      }
    });
  }
});

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });
    video.srcObject = stream;
    updateStatus('Camera ready', 'ok');
  } catch (error) {
    console.error('Camera error:', error);
    updateStatus(`Camera error: ${error.message}`, 'error');
  }
}

function updateStatus(message, className = '') {
  statusElement.textContent = message;
  statusElement.className = 'camera-status ' + className;
}

function captureImage() {
  const canvas = document.getElementById('snapshot-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg');
  localStorage.setItem('capturedPhoto', imageData);

  window.location.href = 'Result.html';
}

function handleFileSelect() {
  const file = fileInput.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    updateUploadStatus('Please select an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    localStorage.setItem('capturedPhoto', e.target.result);
    window.location.href = 'Result.html';
  };

  reader.onerror = () => {
    updateUploadStatus('Error reading file', 'error');
  };

  reader.readAsDataURL(file);
}

function updateUploadStatus(message, className = '') {
  uploadStatus.textContent = message;
  uploadStatus.className = 'camera-status ' + className;
}

export { captureImage };
