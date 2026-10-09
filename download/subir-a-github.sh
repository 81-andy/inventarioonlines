#!/usr/bin/env bash
# =================================================================
# 📦 Script: subir-a-github.sh
# Sube el proyecto "Sistema de Inventario a Tiempo Real" a GitHub
# Repo destino: https://github.com/81-andy/inventarioonlines
# Estrategia: force push (sobrescribe el README existente en GitHub)
# =================================================================
# Uso:
#   1. Descomprime inventarioonlines.tar.gz en una carpeta
#   2. Coloca este script en esa misma carpeta
#   3. Ejecuta: bash subir-a-github.sh
#   4. Pega tu token de GitHub cuando lo pida
# =================================================================
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/81-andy/inventarioonlines.git"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📦 Subir proyecto a GitHub: 81-andy/inventarioonlines    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verifica que estamos en un repo git
if [ ! -d ".git" ]; then
  echo -e "${RED}✗ No estás en un repositorio git.${NC}"
  echo -e "   Descomprime primero inventarioonlines.tar.gz y entra a la carpeta."
  exit 1
fi

# Muestra los commits actuales
echo -e "${YELLOW}📋 Commits actuales en tu repo local:${NC}"
git log --oneline -5
echo ""

# Verifica si ya hay un remote llamado origin
if git remote get-url origin &>/dev/null; then
  echo -e "${YELLOW}⚠ Eliminando remote 'origin' anterior...${NC}"
  git remote remove origin
fi

# Pide el token al usuario (no se muestra en pantalla)
echo -e "${YELLOW}🔑 Necesitas un Personal Access Token de GitHub${NC}"
echo -e "   Genera uno en: https://github.com/settings/tokens/new"
echo -e "   - Marca el scope: ${GREEN}repo${NC}"
echo -e "   - Expiration: 7 days es suficiente"
echo ""
read -s -p "Pega aquí tu token (ghp_xxx...): " TOKEN
echo ""
echo ""

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ No ingresaste ningún token. Abortando.${NC}"
  exit 1
fi

# Configura el remote con el token embebido (temporalmente)
echo -e "${BLUE}🔧 Configurando remote con tu token...${NC}"
git remote add origin "https://81-andy:${TOKEN}@github.com/81-andy/inventarioonlines.git"

# Asegura que la rama se llama main
echo -e "${BLUE}🌿 Renombrando rama a 'main' si es necesario...${NC}"
git branch -M main 2>/dev/null || true

# Hace el force push (sobrescribe el README existente en GitHub)
echo -e "${BLUE}🚀 Subiendo el proyecto a GitHub (force push)...${NC}"
echo -e "   Esto puede tardar unos segundos..."
echo ""
if git push -u origin main --force; then
  echo ""
  echo -e "${GREEN}✓ ¡Proyecto subido correctamente! 🎉${NC}"
  echo ""
  echo -e "${BLUE}🌐 Tu repositorio público:${NC}"
  echo "   https://github.com/81-andy/inventarioonlines"
  echo ""
else
  echo ""
  echo -e "${RED}✗ Error al hacer push. Posibles causas:${NC}"
  echo "   - Token inválido o expirado"
  echo "   - Token no tiene el scope 'repo'"
  echo "   - El repo 81-andy/inventarioonlines no existe (créalo en github.com/new)"
  echo "   - No tienes permisos en el repo 81-andy/inventarioonlines"
  echo ""
  echo -e "${YELLOW}Limpia el remote y vuelve a intentarlo:${NC}"
  git remote set-url origin "$REPO_URL"
  exit 1
fi

# Limpia el token del remote por seguridad
echo -e "${BLUE}🧹 Limpiando el token del remote por seguridad...${NC}"
git remote set-url origin "$REPO_URL"

# Verifica que el token ya no está
URL_FINAL=$(git remote get-url origin)
if echo "$URL_FINAL" | grep -q "ghp_"; then
  echo -e "${RED}⚠ Aún queda el token en la URL. Limpia manualmente:${NC}"
  echo "   git remote set-url origin $REPO_URL"
else
  echo -e "${GREEN}✓ Token limpiado correctamente.${NC}"
fi

echo ""
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡Proceso completado! Tu proyecto está en:${NC}"
echo -e "${GREEN}   https://github.com/81-andy/inventarioonlines${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}🔐 Recomendación de seguridad:${NC}"
echo "   - Revoca el token en https://github.com/settings/tokens"
echo "   - Busca el token llamado 'subir-inventario' y haz click en 'Delete'"
echo ""
