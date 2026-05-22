/**
 * control-edicion.js
 * Sistema de edición visual rápida para la Alcaldía Local Municipal
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const esModoEdicion = params.get('modo') === 'editar';

    if (!esModoEdicion) {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
        });
        document.querySelectorAll('img[onclick*="cambiarImagenVisual"]').forEach(img => {
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
    const panelExistente = document.getElementById('panel-guardado-local');
    if (panelExistente) panelExistente.remove();

    const esLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

    const labelBoton = esLocal 
        ? '💾 Guardar en Disco (Local)' 
        : '💾 Sincronizar con GitHub';

    const contenedorBotonesHTML = `
        <div id="panel-guardado-local" style="position:fixed; bottom:30px; left:30px; display:flex; gap:12px; z-index:9999; font-family:Arial, sans-serif;">
            <button id="btn-sincronizar-fast" style="padding:12px 20px; background:#28a745; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: background 0.2s;">
                ${labelBoton}
            </button>
            <button id="btn-descargar-backup" style="padding:12px 20px; background:#007bff; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: background 0.2s;">
                📥 Descargar HTML (Respaldo)
            </button>
        </div>
    `;

    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', contenedorBotonesHTML);
    }

    const nombreArchivo = window.location.pathname.split("/").pop() || "index.html";

    function obtenerHTMLPurificado() {
        let clonDocumento = document.documentElement.cloneNode(true);
        let panelEnClon = clonDocumento.querySelector('#panel-guardado-local');
        if (panelEnClon) panelEnClon.remove();
        clonDocumento.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
        });
        clonDocumento.querySelectorAll('img[onclick]').forEach(img => {
            img.removeAttribute('onclick');
            img.style.cursor = 'default';
        });
        return "<!DOCTYPE html>\n" + clonDocumento.outerHTML;
    }

    // ── BOTÓN VERDE ────────────────────────────────────────────
    document.getElementById('btn-sincronizar-fast').addEventListener('click', async () => {
        const btnSincro = document.getElementById('btn-sincronizar-fast');
        const panelGlobal = document.getElementById('panel-guardado-local');

        btnSincro.style.background = "#e0a800";
        btnSincro.innerText = "⏳ Guardando...";
        btnSincro.disabled = true;

        panelGlobal.style.display = 'none';
        const codigoVivo = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        panelGlobal.style.display = 'flex';

        try {
            const respuesta = await fetch('/api/guardar-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    archivo: nombreArchivo,
                    html: codigoVivo
                })
            });

            const resultado = await respuesta.json().catch(() => ({ detail: "Respuesta no es JSON" }));

            if (respuesta.ok) {
                btnSincro.style.background = "#155724";
                btnSincro.innerText = esLocal ? "✅ ¡Guardado en disco!" : "✅ ¡Sincronizado con GitHub!";
                console.log("✅ Éxito:", resultado.message);
                setTimeout(() => {
                    btnSincro.style.background = "#28a745";
                    btnSincro.innerText = labelBoton;
                }, 3000);
            } else {
                throw new Error(resultado.detail || `HTTP ${respuesta.status}`);
            }

        } catch (error) {
            console.error("❌ Error:", error);
            alert(`❌ Error al guardar:\n\n${error.message}`);
            btnSincro.style.background = "#28a745";
            btnSincro.innerText = labelBoton;
        } finally {
            btnSincro.disabled = false;
        }
    });

    // ── BOTÓN AZUL ─────────────────────────────────────────────
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

// Doble clic en enlaces para editar URL
if (modoEditarActivo) {
    document.querySelectorAll('a').forEach(enlace => {
        enlace.addEventListener('dblclick', (evento) => {
            evento.preventDefault();
            const rutaActual = enlace.getAttribute('href') || '';
            let nuevaRuta = prompt(`Configurar enlace:`, rutaActual);
            if (nuevaRuta !== null && nuevaRuta.trim() !== "") {
                enlace.setAttribute('href', nuevaRuta.trim());
            }
        });
    });

    document.querySelectorAll('button, .btn, [class*="btn"]').forEach(boton => {
        boton.setAttribute('contenteditable', 'true');
    });

    document.querySelectorAll('input[type="text"], input[type="search"]').forEach(caja => {
        caja.addEventListener('dblclick', (evento) => {
            evento.preventDefault();
            const textoActual = caja.getAttribute('placeholder') || '';
            let nuevoPlaceholder = prompt(`Configurar placeholder:`, textoActual);
            if (nuevoPlaceholder !== null) {
                caja.setAttribute('placeholder', nuevoPlaceholder.trim());
            }
        });
    });
}