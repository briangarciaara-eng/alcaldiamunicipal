/**
 * control-edicion.js
 * Sistema de edición visual rápida para la Alcaldía Local Municipal
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const esModoEdicion = params.get('modo') === 'editar';

    if (!esModoEdicion) {
        const editables = document.querySelectorAll('[contenteditable="true"]');
        editables.forEach(el => el.setAttribute('contenteditable', 'false'));

        const imagenesEditables = document.querySelectorAll('img[onclick*="cambiarImagenVisual"]');
        imagenesEditables.forEach(img => {
            img.removeAttribute('onclick');
            img.style.cursor = 'default';
        });
    }
});

function cambiarImagenVisual(idImg, idInput) {
    const input = document.getElementById(idInput);
    if (input) input.click();
}

function previsualizarNuevaImagen(input, idImg) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(idImg);
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
// CONTROL DE EDICIÓN VISUAL HÍBRIDO - ALCALDÍA LOCAL MUNICIPAL (PORTÁTIL)
// ==========================================================================
const urlParams = new URLSearchParams(window.location.search);
const modoEditarActivo = urlParams.get('modo') === 'editar';

if (!modoEditarActivo) {
    document.querySelectorAll('[contenteditable="true"]').forEach(elemento => {
        elemento.setAttribute('contenteditable', 'false');
    });
    document.querySelectorAll('img[onclick]').forEach(imagen => {
        imagen.removeAttribute('onclick');
        imagen.style.cursor = 'default';
    });
} else {
    // ==========================================================================
    // MODO EDICIÓN ACTIVO: INYECTAR BOTONES DE CONTROL DUAL
    // ==========================================================================
    const panelExistente = document.getElementById('panel-guardado-local');
    if (panelExistente) panelExistente.remove();

    const contenedorBotonesHTML = `
        <div id="panel-guardado-local" style="position:fixed; bottom:30px; left:30px; display:flex; gap:12px; z-index:1000; font-family:Arial, sans-serif;">
            <button id="btn-sincronizar-fast" style="padding:12px 20px; background:#28a745; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: background 0.2s;">
                💾 Sincronizar Tilde/Cambio (Python)
            </button>
            <button id="btn-descargar-backup" style="padding:12px 20px; background:#007bff; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: background 0.2s;">
                📥 Descargar HTML Completo (Respaldo)
            </button>
        </div>
    `;
    
    // Inyección blindada: intenta en el body, si no, en el documento general
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', contenedorBotonesHTML);
    } else {
        document.documentElement.insertAdjacentHTML('beforeend', contenedorBotonesHTML);
    }

    const nombreArchivo = window.location.pathname.split("/").pop() || "index.html";

    function obtenerHTMLPurificado() {
        let clonDocumento = document.documentElement.cloneNode(true);
        let panelEnClon = clonDocumento.querySelector('#panel-guardado-local');
        if (panelEnClon) panelEnClon.remove();

        clonDocumento.querySelectorAll('[contenteditable="true"]').forEach(elemento => {
            elemento.setAttribute('contenteditable', 'false');
        });
        clonDocumento.querySelectorAll('img[onclick]').forEach(imagen => {
            imagen.removeAttribute('onclick');
            imagen.style.cursor = 'default';
        });

        return "<!DOCTYPE html>\n" + clonDocumento.outerHTML;
    }

    // ==========================================================================
    // LÓGICA BOTÓN VERDE: CON ANIMACIÓN VISUAL RESTAURADA
    // ==========================================================================
    document.getElementById('btn-sincronizar-fast').addEventListener('click', async () => {
        const btnSincro = document.getElementById('btn-sincronizar-fast');
        const panelGlobal = document.getElementById('panel-guardado-local');

        // Activamos animación de espera
        btnSincro.style.background = "#e0a800";
        btnSincro.innerText = "⏳ Sincronizando...";
        btnSincro.disabled = true;

        // Ocultamos temporalmente para tomar la foto limpia
        panelGlobal.style.display = 'none';
        const codigoVivoSinBotones = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        panelGlobal.style.display = 'flex';

        try {
            const respuesta = await fetch('http://localhost:8000/api/guardar-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    archivo: nombreArchivo,
                    html: codigoVivoSinBotones
                })
            });

            if (respuesta.ok) {
                // Éxito: Animación verde fija por 2 segundos antes de volver al estado original
                btnSincro.style.background = "#155724";
                btnSincro.innerText = "✅ ¡Sincronizado!";
                setTimeout(() => { 
                    btnSincro.style.background = "#28a745";
                    btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)"; 
                }, 2000);
            } else {
                throw new Error();
            }
        } catch (error) {
            alert("Error al sincronizar con el servidor local de Python.");
            btnSincro.style.background = "#28a745";
            btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)";
        } finally {
            btnSincro.disabled = false;
        }
    });

    // BOTÓN AZUL
    document.getElementById('btn-descargar-backup').addEventListener('click', () => {
        const panelGlobal = document.getElementById('panel-guardado-local');
        panelGlobal.style.display = 'none';
        const codigoLimpio = obtenerHTMLPurificado();
        panelGlobal.style.display = 'flex';

        const blob = new Blob([codigoLimpio], { type: "text/html" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
    });
}

// TRUCO UNIVERSAL PARA ENLACES LARGOS
if (modoEditarActivo) {
    document.querySelectorAll('a').forEach(enlace => {
        enlace.addEventListener('dblclick', (evento) => {
            evento.preventDefault();
            const rutaActual = enlace.getAttribute('href') || 'index.html';
            let nuevaRuta = prompt(`Configurar enlace:`, rutaActual);
            if (nuevaRuta !== null && nuevaRuta.trim() !== "") {
                enlace.setAttribute('href', nuevaRuta.trim());
            }
        });
    });
}

// TRUCO EXPANDIDO: BOTONES Y BÚSQUEDAS
if (modoEditarActivo) {
    document.querySelectorAll('button, .btn, [class*="btn"]').forEach(boton => {
        boton.setAttribute('contenteditable', 'true');
    });

    document.querySelectorAll('input[type="text"], input[type="search"]').forEach(caja => {
        caja.addEventListener('dblclick', (evento) => {
            evento.preventDefault();
            const textoSugerenciaActual = caja.getAttribute('placeholder') || '';
            let nuevoPlaceholder = prompt(`Configurar texto de sugerencia:`, textoSugerenciaActual);
            if (nuevoPlaceholder !== null) {
                caja.setAttribute('placeholder', nuevoPlaceholder.trim());
            }
        });
    });
}
