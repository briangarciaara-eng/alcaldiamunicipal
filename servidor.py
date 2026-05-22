import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Servidor de Producción - Alcaldía Municipal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

class SincronizacionHTML(BaseModel):
    archivo: str
    html: str

# =============================================================================
# DETECCIÓN DE ENTORNO
# =============================================================================
def es_produccion() -> bool:
    return (
        os.getenv("VERCEL") is not None
        or os.getenv("VERCEL_ENV") is not None
        or os.getenv("GITHUB_TOKEN") is not None
    )

# =============================================================================
# ENDPOINT API - GUARDAR HTML
# =============================================================================
@app.post("/api/guardar-html")
async def guardar_html(data: SincronizacionHTML):
    archivo_limpio = os.path.basename(data.archivo)

    # Validación básica
    if not archivo_limpio.endswith(".html"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .html")

    if not es_produccion():
        # ── MODO LOCAL ──────────────────────────────────────────────
        ruta_destino = os.path.join(FRONTEND_DIR, archivo_limpio)
        try:
            with open(ruta_destino, "w", encoding="utf-8") as f:
                f.write(data.html)
            return {"status": "success", "message": f"Guardado local: {archivo_limpio}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    else:
        # ── MODO NUBE → GITHUB ──────────────────────────────────────
        TOKEN = os.getenv("GITHUB_TOKEN")
        # IMPORTANTE: cambia esto por tu usuario/repo real
        REPO_NAME = os.getenv("GITHUB_REPO", "briangiarciara-eng/alcaldiamunicipal")
        RAMA = os.getenv("GITHUB_BRANCH", "main")
        RUTA_EN_REPO = f"frontend/{archivo_limpio}"

        if not TOKEN:
            raise HTTPException(
                status_code=500,
                detail="Falta GITHUB_TOKEN en las variables de entorno de Vercel."
            )

        try:
            from github import Github, GithubException

            g = Github(TOKEN)
            repo = g.get_repo(REPO_NAME)

            # Codificamos el contenido en bytes para PyGithub
            contenido_bytes = data.html.encode("utf-8")

            try:
                # El archivo ya existe → actualizamos
                archivo_actual = repo.get_contents(RUTA_EN_REPO, ref=RAMA)
                repo.update_file(
                    path=RUTA_EN_REPO,
                    message=f"CMS Web: Actualización de {archivo_limpio}",
                    content=contenido_bytes,
                    sha=archivo_actual.sha,
                    branch=RAMA,
                )
                return {
                    "status": "success",
                    "message": f"✅ {archivo_limpio} actualizado en GitHub ({REPO_NAME})"
                }
            except GithubException as e:
                if e.status == 404:
                    # El archivo no existe → lo creamos
                    repo.create_file(
                        path=RUTA_EN_REPO,
                        message=f"CMS Web: Creación de {archivo_limpio}",
                        content=contenido_bytes,
                        branch=RAMA,
                    )
                    return {
                        "status": "success",
                        "message": f"✅ {archivo_limpio} creado en GitHub ({REPO_NAME})"
                    }
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Error GitHub ({e.status}): {e.data}"
                    )

        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PyGithub no está instalado. Agrega 'PyGithub' al requirements.txt"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error inesperado al sincronizar con GitHub: {str(e)}"
            )

# =============================================================================
# RUTAS ESTÁTICAS (solo para desarrollo local)
# =============================================================================
@app.get("/")
async def leer_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# Solo montamos el servidor estático en local (Vercel lo sirve directamente)
if not es_produccion():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)