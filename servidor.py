import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from github import Github

app = FastAPI(title="CMS Alcaldía Municipal - Producción")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


class SincronizacionHTML(BaseModel):
    archivo: str
    html: str


@app.post("/api/guardar-html")
async def guardar_html(data: SincronizacionHTML):
    archivo_limpio = os.path.basename(data.archivo)
    
    # Detectar si estamos en Vercel o en local
    ES_PRODUCCION = os.getenv("VERCEL") is not None or os.getenv("GITHUB_TOKEN") is not None

    if not ES_PRODUCCION:
        # ====================== MODO LOCAL ======================
        ruta_destino = os.path.join(FRONTEND_DIR, archivo_limpio)
        try:
            with open(ruta_destino, "w", encoding="utf-8") as f:
                f.write(data.html)
            return {"status": "success", "message": "Guardado local exitoso."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    else:
        # ====================== MODO VERCEL (GitHub) ======================
        TOKEN = os.getenv("GITHUB_TOKEN")
        OWNER = "briangarciaara-eng"
        REPO_NAME = "alcaldiamunicipal"
        RUTA_EN_REPO = f"frontend/{archivo_limpio}"

        if not TOKEN:
            raise HTTPException(status_code=500, detail="GITHUB_TOKEN no configurado en Vercel")

        try:
            g = Github(TOKEN)
            repo = g.get_repo(f"{OWNER}/{REPO_NAME}")
            
            # Obtener el archivo actual para conseguir el SHA
            contents = repo.get_contents(RUTA_EN_REPO, ref="main")
            
            repo.update_file(
                path=RUTA_EN_REPO,
                message=f"CMS: Actualización de {archivo_limpio}",
                content=data.html,
                sha=contents.sha,
                branch="main"
            )
            
            return {
                "status": "success", 
                "message": f"Archivo {archivo_limpio} actualizado en GitHub correctamente."
            }

        except Exception as e:
            error_msg = str(e)
            print(f"ERROR GITHUB: {error_msg}")  # Esto se ve en los logs de Vercel
            raise HTTPException(
                status_code=500, 
                detail=f"Error al guardar en GitHub: {error_msg}"
            )


# ====================== SERVIR ARCHIVOS ESTÁTICOS ======================
@app.get("/")
async def leer_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)