// Оновлений script.js — українські повідомлення, DPR, drag для тексту, покращене масштабування зображення

let currentProduct = 'mug';
let currentColor = 'white';
let uploadedImage = null;
let textItems = []; // { id, text, size, color, x, y, isDragging }
let canvas = null;
let ctx = null;
let canvas2 = null;
let ctx2 = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas();
  setupEventListeners();
  resetDesigner(); // встановити початкові стани
});

function initializeCanvas() {
  canvas = document.getElementById('designCanvas');
  canvas2 = document.getElementById('designCanvas2');

  setupCanvas(canvas, 160, 160, (c) => ctx = c);
  setupCanvas(canvas2, 140, 120, (c) => ctx2 = c);
}

function setupCanvas(element, w, h, setCtx) {
  if (!element) return;
  const ratio = window.devicePixelRatio || 1;
  element.width = Math.round(w * ratio);
  element.height = Math.round(h * ratio);
  element.style.width = w + 'px';
  element.style.height = h + 'px';
  const c = element.getContext('2d');
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  setCtx(c);

  // Події для перетягування тексту (мікроскопічна підтримка)
  element.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function setupEventListeners() {
  document.querySelectorAll('.product-btn').forEach(btn => btn.addEventListener('click', selectProduct));
  document.querySelectorAll('.color-btn').forEach(btn => btn.addEventListener('click', selectColor));
  const photoInput = document.getElementById('photoInput');
  if (photoInput) photoInput.addEventListener('change', uploadPhoto);
  const textSize = document.getElementById('textSize');
  if (textSize) textSize.addEventListener('input', updateTextSize);
  const addTextBtn = document.getElementById('addTextBtn');
  if (addTextBtn) addTextBtn.addEventListener('click', addText);
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', downloadDesign);
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetDesigner);
}

function selectProduct(e) {
  const btn = e.currentTarget;
  const product = btn.dataset.product;
  if (!product) return;
  currentProduct = product;

  document.querySelectorAll('.product-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('mugPreview').style.display = product === 'mug' ? 'flex' : 'none';
  document.getElementById('tshirtPreview').style.display = product === 'tshirt' ? 'flex' : 'none';

  redrawDesign();
}

function selectColor(e) {
  const btn = e.currentTarget;
  const color = btn.dataset.color;
  if (!color) return;
  currentColor = color;

  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const mug = document.querySelector('.mug');
  const tshirt = document.querySelector('.tshirt');
  if (mug) mug.className = `mug mug-${color}`;
  if (tshirt) tshirt.className = `tshirt tshirt-${color}`;

  redrawDesign();
}

function uploadPhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл занадто великий. Допустимо до 10 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      // центр і масштаб буде обчислено під час redraw
      redrawDesign();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function updateTextSize(e) {
  const val = e.target.value;
  const span = document.getElementById('sizeValue');
  if (span) span.textContent = val;
}

function addText() {
  const textInput = document.getElementById('textInput');
  const textSize = document.getElementById('textSize');
  const textColor = document.getElementById('textColor');

  if (!textInput || !textInput.value.trim()) {
    alert('Будь ласка, введіть текст.');
    return;
  }

  // Додаємо текст по центру макета
  const newItem = {
    id: Date.now(),
    text: textInput.value.trim(),
    size: parseInt(textSize.value) || 24,
    color: textColor.value || '#000000',
    x: 0.5, // відносні координати (0..1)
    y: 0.5,
    isDragging: false
  };
  textItems.push(newItem);

  textInput.value = '';
  redrawDesign();
}

// --- Drag support ---
let activeTextId = null;
let pointerDownOnText = false;

function onPointerDown(event) {
  const { offsetX, offsetY } = getPointerPosOnCanvas(event);
  const c = getCurrentCtx();
  const cvs = getCurrentCanvas();
  if (!c || !cvs) return;

  // знаходимо текст під вказівником (зворотній порядок — останній текст має пріоритет)
  const found = [...textItems].reverse().find(item => {
    const metrics = measureTextOnCanvas(c, item);
    const x = item.x * cvs.width / (window.devicePixelRatio || 1);
    const y = item.y * cvs.height / (window.devicePixelRatio || 1);
    const w = metrics.width;
    const h = item.size;
    return offsetX >= x - w/2 && offsetX <= x + w/2 && offsetY >= y - h && offsetY <= y + 10;
  });

  if (found) {
    activeTextId = found.id;
    found.isDragging = true;
    pointerDownOnText = true;
    event.currentTarget.setPointerCapture && event.currentTarget.setPointerCapture(event.pointerId);
  } else {
    activeTextId = null;
    pointerDownOnText = false;
  }
}

function onPointerMove(event) {
  if (!pointerDownOnText || activeTextId == null) return;
  const { offsetX, offsetY } = getPointerPosOnCanvas(event);
  const cvs = getCurrentCanvas();
  if (!cvs) return;
  const relX = offsetX / (cvs.width / (window.devicePixelRatio || 1));
  const relY = offsetY / (cvs.height / (window.devicePixelRatio || 1));
  const item = textItems.find(t => t.id === activeTextId);
  if (!item) return;
  item.x = clamp(relX, 0.05, 0.95);
  item.y = clamp(relY, 0.05, 0.95);
  redrawDesign();
}

function onPointerUp(event) {
  if (activeTextId != null) {
    const item = textItems.find(t => t.id === activeTextId);
    if (item) item.isDragging = false;
  }
  activeTextId = null;
  pointerDownOnText = false;
}

function getPointerPosOnCanvas(e) {
  const cvs = getCurrentCanvas();
  if (!cvs) return { offsetX: 0, offsetY: 0 };
  // get bounding rect to account for CSS size
  const rect = cvs.getBoundingClientRect();
  const offsetX = (e.clientX - rect.left);
  const offsetY = (e.clientY - rect.top);
  return { offsetX, offsetY };
}

function getCurrentCanvas() {
  return currentProduct === 'mug' ? canvas : canvas2;
}
function getCurrentCtx() {
  return currentProduct === 'mug' ? ctx : ctx2;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function measureTextOnCanvas(c, item) {
  c.save();
  c.font = `${item.size}px Arial`;
  const metrics = c.measureText(item.text);
  c.restore();
  return metrics;
}

function redrawDesign() {
  const cvs = getCurrentCanvas();
  const c = getCurrentCtx();
  if (!c || !cvs) return;

  // очистити
  c.clearRect(0, 0, cvs.width, cvs.height);

  // фон (прозорий)
  // малюємо зображення (центрування і масштабування, зберігаючи пропорції)
  if (uploadedImage) {
    drawImageCover(c, uploadedImage, cvs);
  }

  // малюємо текстові елементи
  textItems.forEach(item => {
    c.save();
    c.font = `${item.size}px Arial`;
    c.fillStyle = item.color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const drawX = item.x * (cvs.width / (window.devicePixelRatio || 1));
    const drawY = item.y * (cvs.height / (window.devicePixelRatio || 1));
    c.fillText(item.text, drawX, drawY);
    c.restore();
  });
}

// Малюємо зображення так, щоб воно покривало канву (cover)
function drawImageCover(c, img, cvs) {
  const dstW = cvs.width / (window.devicePixelRatio || 1);
  const dstH = cvs.height / (window.devicePixelRatio || 1);

  const imgRatio = img.width / img.height;
  const dstRatio = dstW / dstH;

  let sw, sh, sx, sy;

  if (imgRatio > dstRatio) {
    // зображення ширше — обрізати по боках
    sh = img.height;
    sw = sh * dstRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // зображення вищі — обрізати по верх/низ
    sw = img.width;
    sh = sw / dstRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  c.drawImage(img, sx, sy, sw, sh, 0, 0, dstW, dstH);
}

function downloadDesign() {
  const cvs = getCurrentCanvas();
  if (!cvs) {
    alert('Немає активного макета для завантаження.');
    return;
  }
  // Створюємо тимчасовий canvas з потрібним розміром для експорту (висока роздільність)
  const exportCanvas = document.createElement('canvas');
  const exportW = 1200; // бажаний експортний розмір
  const exportH = Math.round(exportW * (cvs.height / cvs.width));
  exportCanvas.width = exportW;
  exportCanvas.height = exportH;
  const exportCtx = exportCanvas.getContext('2d');

  // малюємо фон (білий для білого виробу, або прозорий для ін.)
  exportCtx.fillStyle = '#ffffff';
  exportCtx.fillRect(0, 0, exportW, exportH);

  // малюємо зображення/текст, масштабуючи координати
  if (uploadedImage) {
    // використовуємо подібну логіку cover але в розмірі export
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = exportW;
    tmpCanvas.height = exportH;
    const tmpC = tmpCanvas.getContext('2d');
    drawImageCover(tmpC, uploadedImage, { width: exportW, height: exportH });
    exportCtx.drawImage(tmpCanvas, 0, 0);
  }

  // малюємо текст
  textItems.forEach(item => {
    exportCtx.save();
    exportCtx.fillStyle = item.color;
    const fontSize = item.size * (exportW / (cvs.width / (window.devicePixelRatio || 1)));
    exportCtx.font = `${fontSize}px Arial`;
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    const x = item.x * exportW;
    const y = item.y * exportH;
    exportCtx.fillText(item.text, x, y);
    exportCtx.restore();
  });

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/png');
  link.download = `memory-moments_${currentProduct}_${currentColor}.png`;
  link.click();
}

function resetDesigner() {
  uploadedImage = null;
  textItems = [];
  currentColor = 'white';
  currentProduct = 'mug';

  const photoInput = document.getElementById('photoInput');
  if (photoInput) photoInput.value = '';
  const textInput = document.getElementById('textInput');
  if (textInput) textInput.value = '';
  const textSize = document.getElementById('textSize');
  if (textSize) textSize.value = '24';
  const sizeValue = document.getElementById('sizeValue');
  if (sizeValue) sizeValue.textContent = '24';

  document.querySelectorAll('.product-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
  const defaultProduct = document.querySelector('[data-product="mug"]');
  const defaultColor = document.querySelector('[data-color="white"]');
  if (defaultProduct) defaultProduct.classList.add('active');
  if (defaultColor) defaultColor.classList.add('active');

  // оновити відображення прев'ю
  document.getElementById('mugPreview').style.display = 'flex';
  document.getElementById('tshirtPreview').style.display = 'none';

  redrawDesign();
}
