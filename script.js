// Переменные состояния
let currentProduct = 'mug';
let currentColor = 'white';
let uploadedImage = null;
let textItems = [];
let canvasContext = null;
let canvasContext2 = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    setupEventListeners();
});

function initializeCanvas() {
    const canvas = document.getElementById('designCanvas');
    const canvas2 = document.getElementById('designCanvas2');
    
    if (canvas) {
        canvas.width = 160;
        canvas.height = 160;
        canvasContext = canvas.getContext('2d');
    }
    
    if (canvas2) {
        canvas2.width = 140;
        canvas2.height = 120;
        canvasContext2 = canvas2.getContext('2d');
    }
}

function setupEventListeners() {
    // Выбор изделия
    document.querySelectorAll('.product-btn').forEach(btn => {
        btn.addEventListener('click', selectProduct);
    });

    // Выбор цвета
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', selectColor);
    });

    // Загрузка фото
    document.getElementById('photoInput').addEventListener('change', uploadPhoto);

    // Текст
    document.getElementById('textSize').addEventListener('input', updateTextSize);
    document.getElementById('addTextBtn').addEventListener('click', addText);

    // Действия
    document.getElementById('downloadBtn').addEventListener('click', downloadDesign);
    document.getElementById('resetBtn').addEventListener('click', resetDesigner);
}

function selectProduct(e) {
    const product = e.target.dataset.product;
    currentProduct = product;
    
    // Обновление активной кнопки
    document.querySelectorAll('.product-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Показ нужного превью
    document.getElementById('mugPreview').style.display = product === 'mug' ? 'flex' : 'none';
    document.getElementById('tshirtPreview').style.display = product === 'tshirt' ? 'flex' : 'none';
    
    redrawDesign();
}

function selectColor(e) {
    const color = e.target.dataset.color;
    currentColor = color;
    
    // Обновление активной кнопки
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Обновление цвета изделия
    const mug = document.querySelector('.mug');
    const tshirt = document.querySelector('.tshirt');
    
    mug.classList = `mug mug-${color}`;
    tshirt.classList = `tshirt tshirt-${color}`;
}

function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            redrawDesign();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateTextSize(e) {
    document.getElementById('sizeValue').textContent = e.target.value;
}

function addText() {
    const textInput = document.getElementById('textInput');
    const textSize = document.getElementById('textSize');
    const textColor = document.getElementById('textColor');
    
    if (!textInput.value.trim()) {
        alert('Пожалуйста, введите текст');
        return;
    }
    
    textItems.push({
        text: textInput.value,
        size: parseInt(textSize.value),
        color: textColor.value,
        id: Date.now()
    });
    
    textInput.value = '';
    redrawDesign();
}

function redrawDesign() {
    const canvas = currentProduct === 'mug' 
        ? document.getElementById('designCanvas') 
        : document.getElementById('designCanvas2');
    
    const ctx = canvas.getContext('2d');
    
    // Очистка канваса
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисование загруженного изображения
    if (uploadedImage) {
        const size = Math.min(canvas.width, canvas.height) - 10;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.drawImage(uploadedImage, x, y, size, size);
        ctx.restore();
    }
    
    // Рисование текста
    let yOffset = 20;
    textItems.forEach(item => {
        ctx.font = `${item.size}px Arial`;
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        
        const x = canvas.width / 2;
        const y = yOffset + item.size;
        
        ctx.fillText(item.text, x, y);
        yOffset += item.size + 10;
    });
}

function downloadDesign() {
    const canvas = currentProduct === 'mug' 
        ? document.getElementById('designCanvas') 
        : document.getElementById('designCanvas2');
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `memory-moments-${currentProduct}-${currentColor}.png`;
    link.click();
}

function resetDesigner() {
    uploadedImage = null;
    textItems = [];
    currentColor = 'white';
    currentProduct = 'mug';
    
    document.getElementById('photoInput').value = '';
    document.getElementById('textInput').value = '';
    document.getElementById('textSize').value = '24';
    document.getElementById('sizeValue').textContent = '24';
    
    // Сброс активных кнопок
    document.querySelectorAll('.product-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    
    document.querySelector('[data-product="mug"]').classList.add('active');
    document.querySelector('[data-color="white"]').classList.add('active');
    
    redrawDesign();
}