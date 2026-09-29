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
const MASK_SCALE = 1.15;
const loadedImages = {};
let modelsLoaded = false;
let detectionStarted = false;

// ============================================================
// ELEGIR IMAGEN SEGÚN EDAD Y GÉNERO
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
// CARGAR UNA IMAGEN
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
                "No se pudo cargar:",
                src
            );
            resolve(null);
        };
        img.src = src;
    });
}

// ============================================================
// CARGAR TODAS LAS IMÁGENES
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
    console.log("Todas las imágenes cargadas");
}

// ============================================================
// CARGAR MODELOS DE FACE-API
// ============================================================

async function loadModels() {
    try {
        console.log("Cargando TinyFaceDetector...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(
            "./models"
        );
        console.log("TinyFaceDetector cargado");
        console.log("Cargando FaceLandmark68...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(
            "./models"
        );
        console.log("FaceLandmark68 cargado");
        console.log("Cargando AgeGenderNet...");
        await faceapi.nets.ageGenderNet.loadFromUri(
            "./models"
        );
        console.log("AgeGenderNet cargado");
        modelsLoaded = true;
        console.log("Modelos cargados correctamente");
        await loadMaskImages();
        await video.play();
    } catch (error) {
        modelsLoaded = false;
        console.error(
            "Error cargando los modelos:",
            error
        );
    }
}
window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadModels();
    }
);
video.addEventListener(
    "play",
    () => {
        if (!modelsLoaded) {
            console.error(
                "Los modelos todavía no están cargados"
            );
            return;
        }
        setupCanvas();
        startDetection();
    }
);
function setupCanvas() {
    const width =
        video.clientWidth;
    const height =
        video.clientHeight;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width =
        `${width}px`;
    canvas.style.height =
        `${height}px`;
}


// ============================================================
// INICIAR DETECCIÓN
// ============================================================

function startDetection() {
    if (detectionStarted) {
        return;
    }
    detectionStarted = true;
    const displaySize = {
        width:
            video.clientWidth,
        height:
            video.clientHeight
    };
    faceapi.matchDimensions(
        canvas,
        displaySize
    );
    setInterval(
        async () => {
            if (!modelsLoaded) {
                return;
            }
            let detections;
            try {
                detections =
                    await faceapi
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
            resizedDetections.forEach(
                (detection) => {
                    const age =
                        Math.round(
                            detection.age
                        );
                    const gender =
                        detection.gender;
                    const imagePath =
                        getMaskImagePath(
                            age,
                            gender
                        );
                    if (!imagePath) {
                        return;
                    }
                    const maskImage =
                        loadedImages[
                            imagePath
                        ];
                    if (!maskImage) {
                        return;
                    }
                    const box =
                        detection.detection.box;
                    const maskWidth =
                        box.width * MASK_SCALE;
                    const aspectRatio =
                        maskImage.naturalHeight /
                        maskImage.naturalWidth;
                    const maskHeight =
                        maskWidth *
                        aspectRatio;
                    const x =
                        box.x +
                        (box.width - maskWidth) / 2;
                    const y =
                        box.y +
                        box.height * 0.20;
                    ctx.drawImage(
                        maskImage,
                        x,
                        y,
                        maskWidth,
                        maskHeight
                    );
                }
            );
        },
        100
    );
}
