const URL_MODELO = "modelo/"; 
let modelo;

const progreso = document.getElementById("progreso");
const porcentaje = document.getElementById("porcentaje");
const textoAnalisis = document.getElementById("texto-analisis");
const video = document.getElementById("camara");
const imagenResultado = document.getElementById("imagenResultado");
const bloqueCamara = document.getElementById("bloque-camara");

async function cargarModelo() {
    try {
        modelo = await tmImage.load(URL_MODELO + "model.json", URL_MODELO + "metadata.json");
    } catch (e) {
        console.error(e);
    }
}
window.addEventListener("DOMContentLoaded", cargarModelo);

function cambiarPantalla(id) {
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    document.getElementById(id).classList.add("activa");
}

function abrirArchivo() {
    document.getElementById("archivo").click();
}

function irAAñadirMas() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    cambiarPantalla("pantalla-inicio");
}

function reiniciarTodo() {
    location.reload();
}

async function procesarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    imagenResultado.src = URL.createObjectURL(file);
    imagenResultado.style.display = "block";
    bloqueCamara.style.display = "none";

    cambiarPantalla("pantalla-analisis");
    await analizarImagen(imagenResultado);
}

function tomarFoto() {
    cambiarPantalla("pantalla-resultados");
    imagenResultado.style.display = "none";
    bloqueCamara.style.display = "flex";

    const constraints = { 
        video: { facingMode: "environment" } 
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error(err);
            alert("No se pudo acceder a la cámara trasera.");
        });
}

async function capturarYAnalizar() {
    cambiarPantalla("pantalla-analisis");
    progreso.style.width = "50%";
    porcentaje.textContent = "50%";
    await analizarImagen(video);
}

async function analizarImagen(elemento) {
    if (!modelo) return;

    try {
        const predicciones = await modelo.predict(elemento);
        predicciones.sort((a, b) => b.probability - a.probability);
        const mejor = predicciones[0];

        if (mejor.probability > 0.60) {
            const mapaClases = { "$1": "1", "$2": "2", "$5": "5", "$10": "10", "$20": "20" };
            const valor = mapaClases[mejor.className];

            if (valor) {
                actualizarTablaIndividual(valor);
                progreso.style.width = "100%";
                porcentaje.textContent = "100%";
                textoAnalisis.textContent = "¡Moneda identificada!";

                setTimeout(() => {
                    cambiarPantalla("pantalla-resultados");
                    if (video.srcObject) {
                        const fotoData = capturarFotoDesdeVideo();
                        video.srcObject.getTracks().forEach(t => t.stop());
                        bloqueCamara.style.display = "none";
                        imagenResultado.src = fotoData;
                        imagenResultado.style.display = "block";
                    }
                }, 800);
            }
        } else {
            alert("No se pudo identificar. Intenta de nuevo.");
            irAAñadirMas();
        }
    } catch (e) {
        console.error(e);
    }
}

function actualizarTablaIndividual(valor) {
    ["m1", "m2", "m5", "m10", "m20"].forEach(id => {
        document.getElementById(id).textContent = "0";
    });
    document.getElementById("m" + valor).textContent = "1";
    document.getElementById("total").textContent = valor;
}

function capturarFotoDesdeVideo() {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
}