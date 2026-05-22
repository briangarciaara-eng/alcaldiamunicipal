/**
 * control-edicion.js - Versión Final Corregida para Vercel
 * Sistema de edición visual para Alcaldía Municipal
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const esModoEdicion = params.get('modo') === 'editar';

    if (!esModoEdicion) {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
        });
        document.querySelectorAll('img[onclick]').forEach(img => {
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
            document.getElementById(idImg).src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
// PANEL DE EDICIÓN + SINCRONIZACIÓN
// ==========================================================================
const urlParams = new URLSearchParams(window.location.search);
const modoEditarActivo = urlParams.get('modo') === 'editar';

if (modoEditarActivo) {
    const panelHTML = `
        <div id="panel-guardado-local" style="position:fixed; bottom:30px; left:30px; display:flex; gap:12px; z-index:10000; font-family:Arial, sans-serif;">
            <button id="btn-sincronizar-fast" style="padding:12px 20px; background:#28a745; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s;">
                💾 Sincronizar Tilde/Cambio (Python)
            </button>
            <button id="btn-descargar-backup" style="padding:12px 20px; background:#007bff; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                📥 Descargar HTML Completo (Respaldo)
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    // ====================== BOTÓN SINCRONIZACIÓN ======================
    document.getElementById('btn-sincronizar-fast').addEventListener('click', async () => {
        const btnSincro = document.getElementById('btn-sincronizar-fast');

        btnSincro.style.background = "#e0a800";
        btnSincro.innerText = "⏳ Sincronizando...";
        btnSincro.disabled = true;

        try {
            const htmlCompleto = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

            const response = await fetch('/api/guardar-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    archivo: 'index.html',
                    html: htmlCompleto
                })
            });

            if (response.ok) {
                btnSincro.style.background = "#155724";
                btnSincro.innerText = "✅ ¡Sincronizado!";
                setTimeout(() => {
                    btnSincro.style.background = "#28a745";
                    btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)";
                    btnSincro.disabled = false;
                }, 2500);
            } else {
                const errorText = await response.text();
                console.error("Error servidor:", errorText);
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error("Error completo:", error);
            btnSincro.style.background = "#dc3545";
            btnSincro.innerText = "❌ Error al sincronizar";
            
            setTimeout(() => {
                btnSincro.style.background = "#28a745";
                btnSincro.innerText = "💾 Sincronizar Tilde/Cambio (Python)";
                btnSincro.disabled = false;
            }, 3000);
        }
    });

    // ====================== BOTÓN DE RESPALDO ======================
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