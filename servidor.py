import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    if not TOKEN:
        raise HTTPException(status_code=500, detail="Falta GITHUB_TOKEN en Vercel.")

    try:
        from github import Github, Auth, GithubException

        # Usamos la nueva API de autenticación (evita el DeprecationWarning)
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

# ── HANDLER PARA VERCEL (CRÍTICO) ──────────────────────────
handler = Mangum(app)