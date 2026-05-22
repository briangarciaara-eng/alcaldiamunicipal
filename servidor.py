import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from github import Github

app = FastAPI(title="Servidor de Producción - Alcaldía Municipal")

# Configuración de CORS universal
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas base físicas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

class SincronizacionHTML(BaseModel):
    archivo: str
    html: str

# =============================================================================
# EL ENDPOINT DE LA API (Debe ir arriba para que no lo tape el montaje estático)
# =============================================================================
@app.post("/api/guardar-html")
async def guardar_html(data: SincronizacionHTML):
    archivo_limpio = os.path.basename(data.archivo)
    
    # El interruptor que valida tus variables de Vercel
    ES_PRODUCCION = os.getenv("VERCEL") is not None or os.getenv("GITHUB_TOKEN") is not None

    if not ES_PRODUCCION:
        # Modo Local (Tu PC)
        ruta_destino = os.path.join(FRONTEND_DIR, archivo_limpio)
        try:
            with open(ruta_destino, "w", encoding="utf-8") as f:
                f.write(data.html)
            return {"status": "success", "message": "Guardado local exitoso."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Modo Nube (Vercel -> GitHub)
        TOKEN = os.getenv("GITHUB_TOKEN")
        REPO_NAME = "briangiarciara-eng/alcaldiamunicipal" # <-- Actualizado con tu usuario real de la captura
        RUTA_EN_REPO = f"frontend/{archivo_limpio}"
        
        if not TOKEN:
            raise HTTPException(status_code=500, detail="Falta GITHUB_TOKEN en Vercel.")
        try:
            g = Github(TOKEN)
            repo = g.get_repo(REPO_NAME)
            contents = repo.get_contents(RUTA_EN_REPO, ref="main")
            
            repo.update_file(
                path=RUTA_EN_REPO,
                message=f"CMS Nube: Actualización de {archivo_limpio}",
                content=data.html,
                sha=contents.sha,
                branch="main"
            )
            return {"status": "success", "message": "Sincronizado directamente en GitHub."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error GitHub: {str(e)}")

# =============================================================================
# RESTAURACIÓN DEL MANEJO DE ARCHIVOS ESTÁTICOS (Levanta el sitio web)
# =============================================================================
@app.get("/")
async def leer_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# Mapeo universal para las demás páginas (.html, .js, imágenes)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
