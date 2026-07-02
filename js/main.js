let imagenOriginal = null;

function ajustarProporcionContenedor(width, height) {
    const contenedor = document.getElementById('canvas-container');
    if (contenedor && width > 0 && height > 0) {
        contenedor.style.aspectRatio = `${width} / ${height}`;
    }
}

// Cámara y Captura
let streamActual = null;      // Guarda el stream activo para poder detenerlo al cambiar cámara
let facingModeActual = 'user'; // 'user' = frontal, 'environment' = trasera

async function iniciarCamara(facingMode = facingModeActual) {
    const video = document.getElementById('video-preview');
    const canvas = document.getElementById('image-canvas');
    if (!video) return;

    // Si ya había un stream corriendo (por ejemplo, al cambiar de cámara),
    // hay que apagar sus pistas antes de pedir una nueva. Si no, la cámara
    // anterior se queda "prendida" en segundo plano.
    if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
        });
        streamActual = stream;
        facingModeActual = facingMode;

        video.srcObject = stream;
        video.style.display = 'block';
        canvas.style.display = 'none'; // Oculta el canvas mientras la cámara está activa

        // Cuando el video ya tiene sus dimensiones reales (no antes),
        // ajustamos el contenedor a esa proporción exacta.
        video.addEventListener('loadedmetadata', () => {
            ajustarProporcionContenedor(video.videoWidth, video.videoHeight);
        }, { once: true });
    } catch (err) {
        alert("Error al acceder a la cámara");
    }
}

// Alterna entre cámara frontal y trasera
function cambiarCamara() {
    const nuevoModo = facingModeActual === 'user' ? 'environment' : 'user';
    iniciarCamara(nuevoModo);
}
function iniciarCamaraInicio() {
    window.location.href = "editor.html";
}

function capturarImagen() {
    const video = document.getElementById('video-preview');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');

    if (!video || video.videoWidth === 0) return alert("Cámara no lista");
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    imagenOriginal = ctx.getImageData(0, 0, canvas.width, canvas.height);
    video.style.display = 'none';
    canvas.style.display = 'block'; // Ahora sí se muestra el canvas con la foto capturada
   
}

// Filtros básicos
function aplicarEscalaGrises() {
    if (!imagenOriginal) return;
    const ctx = document.getElementById('image-canvas').getContext('2d');
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let avg = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
        imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
}

// Motor de Filtros (Sliders)
function actualizarFiltros() {
    if (!imagenOriginal) return;
    let b = parseInt(document.getElementById('sliderBrillo').value);
    let c = parseFloat(document.getElementById('sliderContraste').value);
    let blur = parseInt(document.getElementById('sliderBlur').value);

    document.getElementById('valBrillo').innerText = b;
    document.getElementById('valContraste').innerText = c;
    document.getElementById('valBlur').innerText = blur;

    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    let data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * c + 128 + b));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * c + 128 + b));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * c + 128 + b));
    }
    ctx.putImageData(imgData, 0, 0);
    if (blur > 0) {
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    }
}

function resetImagen() {
    if (!imagenOriginal) return;
    document.getElementById('sliderBrillo').value = 0;
    document.getElementById('sliderContraste').value = 1;
    document.getElementById('sliderBlur').value = 0;
    document.getElementById('valBrillo').innerText = "0";
    document.getElementById('valContraste').innerText = "1";
    document.getElementById('valBlur').innerText = "0";
    const ctx = document.getElementById('image-canvas').getContext('2d');
    ctx.putImageData(imagenOriginal, 0, 0);
}

function aplicarSobel() {
    if (!imagenOriginal) return;
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    let src = imagenOriginal.data;
    let dst = new Uint8ClampedArray(src.length);
    const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelIdx = (y * width + x) * 4;
            let valX = 0, valY = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    let i = ((y + ky) * width + (x + kx)) * 4;
                    let gray = (src[i] + src[i+1] + src[i+2]) / 3;
                    valX += gray * Gx[(ky + 1) * 3 + (kx + 1)];
                    valY += gray * Gy[(ky + 1) * 3 + (kx + 1)];
                }
            }
            let magnitude = Math.sqrt(valX * valX + valY * valY);
            dst[pixelIdx] = dst[pixelIdx + 1] = dst[pixelIdx + 2] = magnitude;
            dst[pixelIdx + 3] = 255;
        }
    }
    ctx.putImageData(new ImageData(dst, width, height), 0, 0);
}
function aplicarUmbral() {
    if (!imagenOriginal) return;
    
    // 1. Obtener el valor del slider
    let umbral = parseInt(document.getElementById('sliderUmbral').value);
    document.getElementById('valUmbral').innerText = umbral;
    
    // 2. Preparar el canvas
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    
    // 3. Crear una copia de la original para trabajar (así el slider es suave)
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    let data = imgData.data;

    // 4. Aplicar el umbral
    for (let i = 0; i < data.length; i += 4) {
        // Promedio simple para escala de grises
        let avg = (data[i] + data[i+1] + data[i+2]) / 3;
        
        // Si el promedio es mayor al umbral, blanco; si no, negro
        let valor = (avg >= umbral) ? 255 : 0;
        
        data[i] = data[i+1] = data[i+2] = valor;
        // data[i+3] es el canal alfa (transparencia), lo dejamos igual (255)
    }
    
    // 5. Dibujar resultado
    ctx.putImageData(imgData, 0, 0);
}
// 1. Función para mostrar/ocultar el menú
function toggleMenu() {
    const menu = document.getElementById('formatMenu');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

// 2. Función para descargar (Recibe el formato directamente)
function descargarSeleccionado(formato) {
    const canvas = document.getElementById('image-canvas');
    if (!canvas) {
        alert("Error: No se encontró el lienzo.");
        return;
    }

    // Definimos el MIME type correcto
    const mime = (formato === 'jpeg') ? 'image/jpeg' : 
                 (formato === 'webp') ? 'image/webp' : 'image/png';

    // Convertimos
    const dataURL = canvas.toDataURL(mime, 1.0);
    
    // Forzamos descarga
    const link = document.createElement('a');
    link.download = `Zeanjo_Resultado.${formato === 'jpeg' ? 'jpg' : formato}`;
    link.href = dataURL;
    link.click();
    
    // Ocultamos el menú tras descargar
    document.getElementById('formatMenu').style.display = 'none';
}
// Abre o cierra el menú al tocar el botón
function toggleMenu() {
    const menu = document.getElementById('formatMenu');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

// Función real de descarga
function descargarImagen(formato) {
    const canvas = document.getElementById('image-canvas');
    const tipos = {
        png: { mime: 'image/png', ext: 'png' },
        jpeg: { mime: 'image/jpeg', ext: 'jpg' },
        webp: { mime: 'image/webp', ext: 'webp' },
        bmp: { mime: 'image/bmp', ext: 'bmp' },
        tiff: { mime: 'image/tiff', ext: 'tiff' }
    };
    
    const config = tipos[formato];
    const image = canvas.toDataURL(config.mime, 1.0);
    const link = document.createElement('a');
    link.download = `Zeanjo_Resultado.${config.ext}`;
    link.href = image;
    link.click();
    
    // Cierra el menú automáticamente tras elegir
    document.getElementById('formatMenu').style.display = 'none';
}
function analizarImagen() {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    let pixelesBlancos = 0;
    let totalPixeles = data.length / 4; // Cada píxel tiene 4 canales (RGBA)

    for (let i = 0; i < data.length; i += 4) {
        // Como ya aplicamos el umbral, los píxeles son 0 o 255
        if (data[i] === 255) {
            pixelesBlancos++;
        }
    }

    let porcentaje = ((pixelesBlancos / totalPixeles) * 100).toFixed(2);
    
    // Mostramos el resultado
    document.getElementById('resultadoAnalisis').innerHTML = 
        `<strong>Objetos detectados:</strong> ${pixelesBlancos} px<br>` +
        `<strong>Área ocupada:</strong> ${porcentaje}%`;
}
function cargarImagen(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Guardamos la imagen en la memoria temporal del navegador
            localStorage.setItem('imagenParaEditar', e.target.result);
            // Redirigimos al editor
            window.location.href = 'editor.html';
        };
        reader.readAsDataURL(file);
    }
}
function toggleMenuCarga() {
    const menu = document.getElementById("menuCarga");

    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "flex";
    } else {
        menu.style.display = "none";
    }
}
// Función para la URL
function procesarURL() {
    const url = prompt("Pega aquí el link de tu imagen:");
    if (url) {
        localStorage.setItem('imagenParaEditar', url);
        window.location.href = 'editor.html';
    }
}
function tomarOtraFoto() {
    location.reload();
}
// Negativo
function aplicarNegativo() {
    if (!imagenOriginal) return;
    const ctx = document.getElementById('image-canvas').getContext('2d');
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 255 - imgData.data[i];
        imgData.data[i+1] = 255 - imgData.data[i+1];
        imgData.data[i+2] = 255 - imgData.data[i+2];
    }
    ctx.putImageData(imgData, 0, 0);
}

// Sepia
function aplicarSepia() {
    if (!imagenOriginal) return;
    const ctx = document.getElementById('image-canvas').getContext('2d');
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        let r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
        imgData.data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
        imgData.data[i+1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
        imgData.data[i+2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
    }
    ctx.putImageData(imgData, 0, 0);
}

// Ecualización de Histograma (Mejora el contraste de forma inteligente)
function aplicarEcualizacion() {
    if (!imagenOriginal) return;
    const ctx = document.getElementById('image-canvas').getContext('2d');
    let imgData = new ImageData(new Uint8ClampedArray(imagenOriginal.data), imagenOriginal.width, imagenOriginal.height);
    let data = imgData.data;

    // 1. Calcular histograma
    let hist = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        let gray = Math.round((data[i] + data[i+1] + data[i+2]) / 3);
        hist[gray]++;
    }

    // 2. Calcular función de distribución acumulada
    let cdf = new Array(256);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i-1] + hist[i];

    // 3. Normalizar
    let total = data.length / 4;
    for (let i = 0; i < 256; i++) cdf[i] = Math.round((cdf[i] / total) * 255);

    // 4. Aplicar
    for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i+1] = data[i+2] = cdf[Math.round((data[i] + data[i+1] + data[i+2]) / 3)];
    }
    ctx.putImageData(imgData, 0, 0);
}

// Filtro de Relieve (Emboss) - ¡Se nota muchísimo!
function aplicarRelieve() {
    if (!imagenOriginal) return;
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    let src = imagenOriginal.data;
    let dst = new Uint8ClampedArray(src.length);

    // Matriz de relieve
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let i = (y * width + x) * 4;
            // Diferencia entre píxeles vecinos
            let val = (src[i] - src[i - width * 4 - 4]) + 128;
            dst[i] = dst[i + 1] = dst[i + 2] = val;
            dst[i + 3] = 255;
        }
    }
    ctx.putImageData(new ImageData(dst, width, height), 0, 0);
}
// Filtro de Ondulación (Ripple Effect) - Deforma la imagen físicamente
function aplicarCannySimplificado() {
    if (!imagenOriginal) return;
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // Primero, convertimos a escala de grises
    let imgData = ctx.getImageData(0, 0, w, h);
    let data = imgData.data;
    
    // Aplicamos un filtro de "detección de diferencias" para encontrar cambios bruscos
    let dst = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        // Simple comparador de borde: si el contraste es alto, dejamos el borde
        let val = Math.abs(data[i] - data[i+4] || 0) + Math.abs(data[i] - data[i + w*4] || 0);
        let color = val > 30 ? 255 : 0; // Umbral de histéresis simple
        dst[i] = dst[i+1] = dst[i+2] = color;
        dst[i+3] = 255;
    }
    
    ctx.putImageData(new ImageData(dst, w, h), 0, 0);
}
function restaurarImagenOriginal() {
    // 1. Validamos que exista una imagen original
    if (!imagenOriginal) {
        alert("No hay una imagen original guardada para mostrar.");
        return;
    }
    
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    
    // 2. Restauramos el tamaño del canvas al original (por si habías hecho un recorte)
    canvas.width = imagenOriginal.width;
    canvas.height = imagenOriginal.height;
    
    // 3. Volvemos a pintar los datos originales
    ctx.putImageData(imagenOriginal, 0, 0);
    
    console.log("Imagen restaurada exitosamente.");
}
// Filtro Laplaciano (Detección de bordes omnidireccional)
function aplicarLaplaciano() {
    if (!imagenOriginal) return;
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const src = imagenOriginal.data;
    const dst = new Uint8ClampedArray(src.length);

    // Kernel Laplaciano: detecta cambios bruscos en cualquier dirección
    const kernel = [
         0, -1,  0,
        -1,  4, -1,
         0, -1,  0
    ];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let px = (y * w + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    let i = ((y + ky) * w + (x + kx)) * 4;
                    let k = kernel[(ky + 1) * 3 + (kx + 1)];
                    r += src[i] * k;
                    g += src[i + 1] * k;
                    b += src[i + 2] * k;
                }
            }
            dst[px] = r; dst[px + 1] = g; dst[px + 2] = b; dst[px + 3] = 255;
        }
    }
    ctx.putImageData(new ImageData(dst, w, h), 0, 0);
}