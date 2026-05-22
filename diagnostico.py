import os
import sys

print("=" * 60)
print("DIAGNÓSTICO DE ENTORNO")
print("=" * 60)

# Variables de entorno relevantes
vars_check = ["VERCEL", "VERCEL_ENV", "GITHUB_TOKEN", "GITHUB_REPO", "GITHUB_BRANCH"]
for v in vars_check:
    val = os.getenv(v)
    if val:
        # Ocultar token por seguridad
        display = val[:8] + "..." if v == "GITHUB_TOKEN" else val
        print(f"  ✅ {v} = {display}")
    else:
        print(f"  ❌ {v} = NO DEFINIDA")

print()

# Verificar PyGithub
print("VERIFICANDO DEPENDENCIAS:")
try:
    from github import Github, GithubException
    print("  ✅ PyGithub importado correctamente")
    
    TOKEN = os.getenv("GITHUB_TOKEN")
    REPO_NAME = os.getenv("GITHUB_REPO", "briangiarciara-eng/alcaldiamunicipal")
    
    if TOKEN:
        print(f"\nVERIFICANDO CONEXIÓN A GITHUB:")
        print(f"  Repo objetivo: {REPO_NAME}")
        try:
            g = Github(TOKEN)
            user = g.get_user()
            print(f"  ✅ Token válido - Usuario: {user.login}")
            
            try:
                repo = g.get_repo(REPO_NAME)
                print(f"  ✅ Repo encontrado: {repo.full_name}")
                print(f"  ✅ Rama default: {repo.default_branch}")
                
                # Verificar que puede leer frontend/index.html
                try:
                    f = repo.get_contents("frontend/index.html", ref="main")
                    print(f"  ✅ frontend/index.html accesible (SHA: {f.sha[:8]}...)")
                except Exception as e:
                    print(f"  ❌ No puede leer frontend/index.html: {e}")
                    
            except Exception as e:
                print(f"  ❌ Repo no encontrado: {e}")
                print(f"     → Verifica que GITHUB_REPO sea exactamente: usuario/repositorio")
        except Exception as e:
            print(f"  ❌ Token inválido o expirado: {e}")
    else:
        print("  ⚠️  GITHUB_TOKEN no disponible, no se puede probar conexión")
        
except ImportError as e:
    print(f"  ❌ PyGithub NO instalado: {e}")
    print("     → Asegúrate que requirements.txt tiene 'PyGithub'")

print()
print("PYTHON VERSION:", sys.version)
print("=" * 60)