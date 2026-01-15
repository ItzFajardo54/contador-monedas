const URL_MODELO = "modelo/"; 
let modelo;
let historialFotos = []; 
let indiceFotoActual = 0;
let acumulado = { m1: 0, m2: 0, m5: 0, m10: 0, m20: 0, total: 0 };

const barraProgreso = document.getElementById("progreso"); // Corregido el nombre para evitar conflictos
const textoPorcentaje = document.getElementById("porcentaje");
const video = document.getElementById("camara");
const imagenResultado = document.getElementById("imagenResultado");
const bloqueCamara = document.getElementById("bloque-camara");

// CARGAR EL MODELO AL INICIO
async function cargarModelo() {
    try {
        // Esta función busca model.json y metadata.json en tu carpeta /modelo
        modelo = await tmImage.load(URL_MODELO + "model.json", URL_MODELO + "metadata.json");
        console.log("Modelo cargado exitosamente");
    } catch (e) { 
        console.error("Error al cargar modelo:", e);
        alert("No se pudo cargar el cerebro de la IA. Verifica la carpeta /modelo");
    }
}
window.addEventListener("DOMContentLoaded", cargarModelo);

function cambiarPantalla(id) {
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    document.getElementById(id).classList.add("activa");
}

function abrirArchivo() { document.getElementById("archivo").click(); }

function tomarFoto() {
    cambiarPantalla("pantalla-resultados");
    document.getElementById("carrusel-fotos").style.display = "none";
    bloqueCamara.style.display = "flex";

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => { video.srcObject = stream; })
        .catch(err => alert("Error al acceder a la cámara."));
}

async function procesarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;
    let url = URL.createObjectURL(file);
    cambiarPantalla("pantalla-analisis");
    await analizarImagen(url, true);
}

async function capturarYAnalizar() {
    const dataFoto = capturarFotoDesdeVideo();
    cambiarPantalla("pantalla-analisis");
    await analizarImagen(dataFoto, false);
}

function capturarFotoDesdeVideo() {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
}

async function analizarImagen(fuente, esArchivo) {
    if (!modelo) return;

    // Animación de la barra de progreso (Efecto visual para mañana)
    let p = 0;
    const intervalo = setInterval(() => {
        p += 10;
        if (p <= 90) {
            barraProgreso.style.width = p + "%";
            textoPorcentaje.textContent = p + "%";
        }
    }, 50);

    let elementoAnalizar;
    if(esArchivo) {
        elementoAnalizar = new Image();
        elementoAnalizar.src = fuente;
        await elementoAnalizar.decode();
    } else {
        // Si viene de la cámara, creamos una imagen temporal para el análisis
        elementoAnalizar = new Image();
        elementoAnalizar.src = fuente;
        await elementoAnalizar.decode();
    }

    // LA NEURONA PREDICE AQUÍ
    const predicciones = await modelo.predict(elementoAnalizar);
    predicciones.sort((a, b) => b.probability - a.probability);
    const mejor = predicciones[0];

    clearInterval(intervalo);
    barraProgreso.style.width = "100%";
    textoPorcentaje.textContent = "100%";

    // El mapa de clases debe coincidir con lo que pusiste en Teachable Machine
    const mapaClases = { 
        "$1": "1", 
        "$2": "2", 
        "$5": "5", 
        "$10": "10", 
        "$20": "20" 
    };

    // Validamos que la probabilidad sea alta (más del 60%) y que no sea la clase "Fondo"
    if (mejor.probability > 0.60 && mapaClases[mejor.className]) {
        const valor = mapaClases[mejor.className];

        actualizarTablaIndividual(valor);
        historialFotos.push(fuente);
        indiceFotoActual = historialFotos.length - 1;

        setTimeout(() => {
            detenerCamara();
            bloqueCamara.style.display = "none";
            document.getElementById("carrusel-fotos").style.display = "flex";
            document.getElementById("contador-fotos").style.display = "block";
            actualizarVistaCarrusel();
            cambiarPantalla("pantalla-resultados");
        }, 600);
    } else {
        setTimeout(() => {
            alert("La neurona no está segura o es el fondo. Intenta de nuevo.");
            irAAñadirMas();
            // Reset de barra para la próxima vez
            barraProgreso.style.width = "0%";
            textoPorcentaje.textContent = "0%";
        }, 500);
    }
}

function actualizarTablaIndividual(valor) {
    acumulado["m" + valor] += 1;
    acumulado.total += parseInt(valor);
    document.getElementById("m" + valor).textContent = acumulado["m" + valor];
    document.getElementById("total").textContent = acumulado.total;
}

function navegarCarrusel(dir) {
    if (indiceFotoActual + dir >= 0 && indiceFotoActual + dir < historialFotos.length) {
        indiceFotoActual += dir;
        actualizarVistaCarrusel();
    }
}

function actualizarVistaCarrusel() {
    imagenResultado.src = historialFotos[indiceFotoActual];
    imagenResultado.classList.add("mostrar");
    document.getElementById("idx-actual").textContent = indiceFotoActual + 1;
    document.getElementById("idx-total").textContent = historialFotos.length;
    
    document.querySelector(".flecha-izq").classList.toggle("desactivada", indiceFotoActual === 0);
    document.querySelector(".flecha-der").classList.toggle("desactivada", indiceFotoActual === historialFotos.length - 1);
}

function detenerCamara() {
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
}

function reiniciarTodo() { 
    if(confirm("¿Quieres vaciar el monedero?")) {
        location.reload(); 
    }
}

function irAAñadirMas() { 
    detenerCamara(); 
    cambiarPantalla("pantalla-inicio"); 
}