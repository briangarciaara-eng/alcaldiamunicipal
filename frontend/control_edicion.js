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
// CONTROL DE EDICIÓN VISUAL HÍBRIDO
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

    document.body.insertAdjacentHTML('beforeend', contenedorBotonesHTML);

    // ====================== BOTÓN SINCRONIZACIÓN ======================
    document.getElementById('btn-sincronizar-fast').addEventListener('click', async () => {
        const btnSincro = document.getElementById('btn-sincronizar-fast');

        btnSincro.style.background = "#e0a800";
        btnSincro.innerText = "⏳ Sincronizando...";
        btnSincro.disabled = true;

        try {
            const codigoVivo = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

            const respuesta = await fetch('/api/guardar-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    archivo: 'index.html',
                    html: codigoVivo
                })
            });

            if (respuesta.ok) {
                btnSincro.style.background = "#155724";
                btnSincro.innerText = "✅ ¡Sincronizado!";
                setTimeout(() => {
                    btnSincro.style.background = "#28a745";
                    btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)";
                    btnSincro.disabled = false;
                }, 2500);
            } else {
                throw new Error('Error del servidor');
            }
        } catch (error) {
            console.error(error);
            btnSincro.style.background = "#dc3545";
            btnSincro.innerText = "❌ Error de conexión";
            setTimeout(() => {
                btnSincro.style.background = "#28a745";
                btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)";
                btnSincro.disabled = false;
            }, 3000);
        }
    });

    // Botón respaldo
    document.getElementById('btn-descargar-backup').addEventListener('click', () => {
        const contenido = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        const blob = new Blob([contenido], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index_backup.html';
        a.click();
        URL.revokeObjectURL(url);
    });
}