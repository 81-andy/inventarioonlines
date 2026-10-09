# 📦 Paquete para subir el proyecto a GitHub

Este paquete contiene todo lo necesario para subir el **Sistema de Inventario a Tiempo Real** al repositorio `https://github.com/81-andy/inventarioonlines`.

## 📋 Archivos incluidos

| Archivo | Tamaño | Descripción |
|---|---|---|
| `inventarioonlines.tar.gz` | ~40 MB | Proyecto completo (sin node_modules, sin .next) |
| `inventarioonlines.git-bundle` | ~226 KB | Bundle git (preserva todo el historial de commits) |
| `subir-a-github.sh` | Script | Script automatizado para hacer el push a GitHub |

## 🚀 Opción A: Usar el script automatizado (recomendado)

### Paso 1: Descarga los 3 archivos a tu computadora
Descarga `inventarioonlines.tar.gz`, `inventarioonlines.git-bundle` y `subir-a-github.sh` a una carpeta nueva, por ejemplo `~/inventarioonlines/`.

### Paso 2: Descomprime el proyecto
```bash
# En tu terminal Linux/Mac:
mkdir -p ~/inventarioonlines
cd ~/inventarioonlines
tar -xzf inventarioonlines.tar.gz
```

### Paso 3: Restaura el historial git desde el bundle
```bash
git fetch inventarioonlines.git-bundle main:main
git checkout main
```

### Paso 4: Ejecuta el script de subida
```bash
bash subir-a-github.sh
```
El script te pedirá tu token de GitHub (genéralo en https://github.com/settings/tokens/new con el scope `repo`).

¡Listo! El proyecto quedará en `https://github.com/81-andy/inventarioonlines`.

---

## 🛠️ Opción B: Comandos manuales

Si prefieres hacerlo a mano:

```bash
# 1. Descomprime y entra a la carpeta:
mkdir -p ~/inventarioonlines && cd ~/inventarioonlines
tar -xzf inventarioonlines.tar.gz

# 2. Restaura el historial git:
git fetch inventarioonlines.git-bundle main:main
git checkout main

# 3. Genera un token en https://github.com/settings/tokens/new (scope: repo)
#    Copia el token (algo como ghp_xxx...)

# 4. Agrega el remote con tu token:
git remote add origin https://81-andy:TU_TOKEN@github.com/81-andy/inventarioonlines.git

# 5. Push forzado (sobrescribe el README existente en GitHub):
git push -u origin main --force

# 6. Limpia el token del remote:
git remote set-url origin https://github.com/81-andy/inventarioonlines.git

# 7. Verifica:
git remote -v
#   origin  https://github.com/81-andy/inventarioonlines.git
```

---

## 🎯 Opción C: Solo subir lo nuevo (si ya tienes el repo local)

Si ya descargaste el proyecto antes y solo quieres subirlo:

```bash
cd /ruta/a/tu/proyecto/local

# 1. Genera token en https://github.com/settings/tokens/new (scope: repo)

# 2. Agrega remote con token:
git remote add origin https://81-andy:TU_TOKEN@github.com/81-andy/inventarioonlines.git

# 3. Force push:
git push -u origin main --force

# 4. Limpia token:
git remote set-url origin https://github.com/81-andy/inventarioonlines.git
```

---

## 🔐 Seguridad

- **NUNCA** subas el token a otro repositorio o lo compartas en chats públicos.
- **REVOCAR** el token después de usarlo en https://github.com/settings/tokens (buscar "subir-inventario" → Delete).
- El script `subir-a-github.sh` **limpia automáticamente** el token del remote después del push.

---

## ❓ Preguntas frecuentes

**¿Por qué necesito un token?**
GitHub ya no permite usar contraseñas para `git push` desde 2021. Solo acepta Personal Access Tokens.

**¿Por qué `--force`?**
Porque el repo `81-andy/inventarioonlines` ya tiene un commit con un README básico. El force push sobrescribe ese commit con el nuestro.

**¿Necesito instalar algo?**
Solo `git` (viene preinstalado en Mac y la mayoría de distros Linux). En Windows descárgalo de https://git-scm.com.

**¿El token se guarda en algún lado?**
No. El script lo usa una sola vez para el push y luego lo elimina del remote. Después de eso, el token solo vive en tu memoria (y en GitHub, donde puedes revocarlo).
