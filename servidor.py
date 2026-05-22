import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Servidor - Alcaldía Municipal")

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

@app.get("/api/ping")
async def ping():
    return {
        "status": "ok",
        "vercel": os.getenv("VERCEL_ENV", "local"),
        "github_token": "✅ configurado" if os.getenv("GITHUB_TOKEN") else "❌ falta",
        "github_repo": os.getenv("GITHUB_REPO", "briangarciaara-eng/alcaldiamunicipal"),
    }

@app.post("/api/guardar-html")
async def guardar_html(data: SincronizacionHTML):
    archivo_limpio = os.path.basename(data.archivo)

    if not archivo_limpio.endswith(".html"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .html")

    TOKEN = os.getenv("GITHUB_TOKEN")
    REPO_NAME = os.getenv("GITHUB_REPO", "briangarciaara-eng/alcaldiamunicipal")
    RAMA = os.getenv("GITHUB_BRANCH", "main")
    RUTA_EN_REPO = f"frontend/{archivo_limpio}"

    # ── MODO LOCAL: guarda directamente en disco ──────────────
    if not os.getenv("VERCEL") and not os.getenv("VERCEL_ENV"):
        ruta_destino = os.path.join(FRONTEND_DIR, archivo_limpio)
        try:
            with open(ruta_destino, "w", encoding="utf-8") as f:
                f.write(data.html)
            return {"status": "success", "message": f"✅ Guardado local: {archivo_limpio}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # ── MODO VERCEL: sincroniza con GitHub ────────────────────
    if not TOKEN:
        raise HTTPException(status_code=500, detail="Falta GITHUB_TOKEN en Vercel.")

    try:
        from github import Github, Auth, GithubException

        auth = Auth.Token(TOKEN)
        g = Github(auth=auth)
        repo = g.get_repo(REPO_NAME)
        contenido_bytes = data.html.encode("utf-8")

        try:
            archivo_actual = repo.get_contents(RUTA_EN_REPO, ref=RAMA)
            repo.update_file(
                path=RUTA_EN_REPO,
                message=f"CMS Web: Actualización de {archivo_limpio}",
                content=contenido_bytes,
                sha=archivo_actual.sha,
                branch=RAMA,
            )
            return {"status": "success", "message": f"✅ {archivo_limpio} actualizado en GitHub"}

        except GithubException as e:
            if e.status == 404:
                repo.create_file(
                    path=RUTA_EN_REPO,
                    message=f"CMS Web: Creación de {archivo_limpio}",
                    content=contenido_bytes,
                    branch=RAMA,
                )
                return {"status": "success", "message": f"✅ {archivo_limpio} creado en GitHub"}
            raise HTTPException(status_code=500, detail=f"Error GitHub ({e.status}): {e.data}")

    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Dependencia faltante: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ── ARCHIVOS ESTÁTICOS (solo local) ───────────────────────────
@app.get("/")
async def leer_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if not os.getenv("VERCEL") and not os.getenv("VERCEL_ENV"):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# ── MANGUM (solo Vercel) ──────────────────────────────────────
if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
    from mangum import Mangum
    handler = Mangum(app)

# ── LOCAL ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)