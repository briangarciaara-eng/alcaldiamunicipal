import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from github import Github

app = FastAPI(title="Servidor Seguro y Estable - Alcaldía Municipal")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Modelo de datos idéntico a tu JavaScript
class SincronizacionHTML(BaseModel):
    archivo: str
    html: str

@app.post("/api/guardar-html")
async def guardar_html(data: SincronizacionHTML):
    archivo_limpio = os.path.basename(data.archivo)
    
    # Detecta si está en Vercel o Local
    ES_PRODUCCION = os.getenv("VERCEL") is not None or os.getenv("GITHUB_TOKEN") is not None

    if not ES_PRODUCCION:
        # ---------------------------------------------------------------------
        # MODO LOCAL: Guarda el HTML exactamente como lo tienes en pantalla
        # ---------------------------------------------------------------------
        ruta_destino = os.path.join(FRONTEND_DIR, archivo_limpio)
        try:
            with open(ruta_destino, "w", encoding="utf-8") as f:
                f.write(data.html)
            return {"status": "success", "message": "Guardado local exitoso."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    else:
        # ---------------------------------------------------------------------
        # MODO NUBE: Envía el archivo directamente a tu GitHub
        # ---------------------------------------------------------------------
        TOKEN = os.getenv("GITHUB_TOKEN")
        REPO_NAME = "tu_usuario_github/alcaldiamunicipal"  # <-- Cambiar en producción
        RUTA_EN_REPO = f"frontend/{archivo_limpio}"
        
        if not TOKEN:
            raise HTTPException(status_code=500, detail="Falta GITHUB_TOKEN")
        try:
            g = Github(TOKEN)
            repo = g.get_repo(REPO_NAME)
            contents = repo.get_contents(RUTA_EN_REPO, ref="main")
            
            repo.update_file(
                path=RUTA_EN_REPO,
                message=f"CMS: Actualización de {archivo_limpio}",
                content=data.html,
                sha=contents.sha,
                branch="main"
            )
            return {"status": "success", "message": "Sincronizado en GitHub."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
