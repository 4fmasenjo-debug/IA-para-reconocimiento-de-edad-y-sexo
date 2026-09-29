const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ============================================================
// IMÁGENES SEGÚN EDAD Y GÉNERO
// ============================================================

const MASK_IMAGES = {
    male: {
        child: "pez koi.png",
        adult: "tigre.png",
        senior: "tortuga.png"
    },
    female: {
        child: "muñeca.png",
        adult: "pavo real.png",
        senior: "mariposa.png"
    }
};
const MASK_SCALE = 0.85;
const loadedImages = {};
let modelsLoaded = false;
let detectionStarted = false;

// ============================================================
// OBTENER IMAGEN SEGÚN EDAD Y GÉNERO
// ============================================================

function getMaskImagePath(age, gender) {
    if (gender !== "male" && gender !== "female") {
        return null;
    }
    if (age < 18) {
        return MASK_IMAGES[gender].child;
    }
    if (age <= 60) {
        return MASK_IMAGES[gender].adult;
    }
    return MASK_IMAGES[gender].senior;
}

// ============================================================
// CARGAR IMAGEN
// ============================================================

function loadImage(src) {
    return new Promise(resolve => {
        if (loadedImages[src]) {
            resolve(loadedImages[src]);
            return;
        }
        const img = new Image();
        img.onload = () => {
            loadedImages[src] = img;
            console.log("Imagen cargada:", src);
            resolve(img);
        };
        img.onerror = () => {
            console.error(
                "No se pudo cargar la imagen:",
                src
            );
            resolve(null);
        };
        img.src = src;
    });
}

// ============================================================
// CARGAR TODAS LAS MÁSCARAS
// ============================================================

async function loadMaskImages() {
    const imagePaths = [
        "pez koi.png",
        "tigre.png",
        "tortuga.png",
        "muñeca.png",
        "pavo real.png",
        "mariposa.png"
    ];
    await Promise.all(
        imagePaths.map(path => loadImage(path))
    );
    console.log("Todas las imágenes están cargadas");
}

// ============================================================
// CARGAR MODELOS
// ============================================================

async function loadModels() {
    console.log;
    console.log;
    console.log;
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
        console.log("TinyFaceDetector cargado");
        await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
        console.log("FaceLandmark68 cargado");
        await faceapi.nets.ageGenderNet.loadFromUri("./models");
        console.log("AgeGenderNet cargado");
        modelsLoaded = true;
        console.log;
        console.log;
        console.log;
        await loadMaskImages();
        await video.play();
    } catch (error) {
        modelsLoaded = false;
        console.error;
        console.error;
        console.error;
        console.error(error);
        console.error(
        );
    }
}
window.addEventListener("DOMContentLoaded", () => {
    loadModels();
});

// ============================================================
// VÍDEO
// ============================================================

video.addEventListener("play", () => {
    console.log("Vídeo reproduciéndose");
    if (!modelsLoaded) {
        console.error(
        );
        return;
    }
    setupCanvas();
    startDetection();
});

// ============================================================
// CONFIGURAR CANVAS
// ============================================================

function setupCanvas() {
    const width = video.clientWidth;
    const height = video.clientHeight;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    console.log(
        "Canvas:",
        width,
        "x",
        height
    );
}

// ============================================================
// DETECCIÓN
// ============================================================

function startDetection() {
    if (detectionStarted) {
        return;
    }
    detectionStarted = true;
    console.log("Iniciando detección facial...");
    const displaySize = {
        width: video.clientWidth,
        height: video.clientHeight
    };
    faceapi.matchDimensions(
        canvas,
        displaySize
    );
    setInterval(async () => {
        if (!modelsLoaded) {
            return;
        }
        let detections;
        try {
            detections = await faceapi
                .detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 512,
                        scoreThreshold: 0.35
                    })
                )
                .withFaceLandmarks()
                .withAgeAndGender();
        } catch (error) {
            console.error(
                "Error detectando:",
                error
            );
            return;
        }
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
        const resizedDetections =
            faceapi.resizeResults(
                detections,
                displaySize
            );

        // ====================================================
        // PROCESAR CADA PERSONA
        // ====================================================

        resizedDetections.forEach(
            (detection, index) => {

                // =============================================
                // EDAD
                // =============================================

                const age = Math.round(
                    detection.age
                );

                // =============================================
                // GÉNERO
                // =============================================

                const gender =
                    detection.gender;

                // =============================================
                // PROBABILIDAD
                // =============================================

                const genderProbability =
                    Math.round(
                        detection.genderProbability * 100
                    );
                console.log(
                    `Persona ${index + 1}:`,
                    `Edad=${age}`,
                    `Género=${gender}`,
                    `Confianza=${genderProbability}%`
                );

                // =============================================
                // OBTENER MÁSCARA
                // =============================================

                const imagePath =
                    getMaskImagePath(
                        age,
                        gender
                    );

                if (!imagePath) {
                    return;
                }
                const maskImage =
                    loadedImages[imagePath];

                if (!maskImage) {
                    return;
                }

                // =============================================
                // POSICIÓN DE LA CARA
                // =============================================

                const box =
                    detection.detection.box;
                const maskWidth =
                    box.width * MASK_SCALE;
                const aspectRatio =
                    maskImage.naturalHeight /
                    maskImage.naturalWidth;
                const maskHeight =
                    maskWidth * aspectRatio;
                const centerX =
                    box.x +
                    box.width / 2;
                const centerY =
                    box.y +
                    box.height / 2;
                const x =
                    centerX -
                    maskWidth / 2;
                const y =
                    centerY -
                    maskHeight / 2;
                // =============================================
                // DIBUJAR MÁSCARA
                // =============================================

                ctx.drawImage(
                    maskImage,
                    x,
                    y,
                    maskWidth,
                    maskHeight
                );
            }
        );
    }, 100);
}
