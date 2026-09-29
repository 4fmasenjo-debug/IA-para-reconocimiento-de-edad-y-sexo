const video =
    document.getElementById("video");
const canvas =
    document.getElementById("canvas");
const ctx =
    canvas.getContext("2d");

// ============================================================
// IMÁGENES SEGÚN EDAD Y GÉNERO
// ============================================================

const MASK_IMAGES = {
    male: {
        // 0 - 17
        child: "pez koi.png",
        // 18 - 60
        adult: "tigre.png",
        // 61+
        senior: "tortuga.png"
    },

    female: {
        // 0 - 17
        child: "muñeca.png",
        // 18 - 60
        adult: "pavo real.png",
        // 61+
        senior: "mariposa.png"
    }
};
const MASK_SCALE = 0.85; //TAMAÑO MÁSCARAS
const loadedImages = {};

// ============================================================
// OBTENER IMAGEN SEGÚN EDAD Y GÉNERO
// ============================================================

function getMaskImagePath(
    age,
    gender
) {
    if (
        gender !== "male" &&
        gender !== "female"
    ) {
        return null;
    }
    if (age < 18) {
        return MASK_IMAGES[
            gender
        ].child;
    }
    if (age <= 60) {
        return MASK_IMAGES[
            gender
        ].adult;
    }
    return MASK_IMAGES[
        gender
    ].senior;
}
function loadImage(src) {
    return new Promise(
        resolve => {
            if (
                loadedImages[src]
            ) {
                resolve(
                    loadedImages[src]
                );

                return;
            }
            const img =
                new Image();
            img.onload = () => {
                loadedImages[src] =
                    img;
                console.log(
                    "Imagen cargada:",
                    src
                );
                resolve(img);
            };
            img.onerror = () => {
                console.error(
                    "No se pudo cargar:",
                    src
                );
                resolve(null);
            };
            img.src =
                src;
        }
    );
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
        imagePaths.map(
            path =>
                loadImage(path)
        )
    );

    console.log(
        "Todas las imágenes están cargadas"
    );
}

// ============================================================
// CARGAR MODELOS
// ============================================================

async function loadModels() {
    console.log(
        "================================"
    );
    console.log(
        "Cargando modelos..."
    );
    console.log(
        "================================"
    );
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector
                .loadFromUri("/models"),
            faceapi.nets.faceLandmark68Net
                .loadFromUri("/models"),
            faceapi.nets.ageGenderNet
                .loadFromUri("/models")
        ]);
        console.log(
            "Modelos cargados correctamente"
        );
        await loadMaskImages();
        await video.play();
    }
    catch (error) {
        console.error(
            "ERROR:",
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
        console.log(
            "Vídeo reproduciéndose"
        );
        setupCanvas();
        startDetection();
    }
);
function setupCanvas() {
    const width =
        video.clientWidth;
    const height =
        video.clientHeight;
    canvas.width =
        width;
    canvas.height =
        height;
    canvas.style.width =
        `${width}px`;
    canvas.style.height =
        `${height}px`;
    console.log(
        "Canvas:",
        width,
        "x",
        height
    );
}
function startDetection() {
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
            let detections;
            try {
                detections =
                    await faceapi
                        .detectAllFaces(
                            video,
                            new faceapi
                                .TinyFaceDetectorOptions({
                                    inputSize: 512,
                                    scoreThreshold: 0.35
                                })
                        )
                        .withFaceLandmarks()
                        .withAgeAndGender();
            }
            catch (error) {
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

            // ================================================
            // PROCESAR CADA PERSONA
            // ================================================

            resizedDetections.forEach(
                (detection, index) => {


                    // =========================================
                    // EDAD
                    // =========================================

                    const age =
                        Math.round(
                            detection.age
                        );

                    // =========================================
                    // GÉNERO
                    // =========================================

                    const gender =
                        detection.gender;

                    // =========================================
                    // PERSONA
                    // =========================================

                    const genderProbability =
                        Math.round(
                            detection.genderProbability
                            * 100
                        );
                    console.log(
                        `Persona ${index + 1}:`,
                        `Edad=${age}`,
                        `Género=${gender}`,
                        `Confianza=${genderProbability}%`
                    );
                    const imagePath =
                        getMaskImagePath(
                            age,
                            gender
                        );
                    if (
                        !imagePath
                    ) {
                        return;
                    }
                    const maskImage =
                        loadedImages[
                            imagePath
                        ];
                    if (
                        !maskImage
                    ) {
                        return;
                    }
                    const box =
                        detection
                            .detection
                            .box;
                    const maskWidth =
                        box.width
                        *
                        MASK_SCALE;
                    const aspectRatio =
                        maskImage.naturalHeight
                        /
                        maskImage.naturalWidth;
                    const maskHeight =
                        maskWidth
                        *
                        aspectRatio;
                    const centerX =
                        box.x
                        +
                        box.width / 2;
                    const centerY =
                        box.y
                        +
                        box.height / 2;
                    const x =
                        centerX
                        -
                        maskWidth / 2;
                    const y =
                        centerY
                        -
                        maskHeight / 2;
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