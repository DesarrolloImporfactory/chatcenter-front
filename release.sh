#!/usr/bin/env bash
#
# release.sh - Genera la siguiente version y publica el tag que dispara
#              el workflow "Release and deploy production"
#              (.github/workflows/release.yml).
#
set -euo pipefail

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'

info() { echo "${BLUE}>>>${NC} $*"; }
ok()   { echo "${GREEN}OK${NC} $*"; }
warn() { echo "${YELLOW}!${NC} $*"; }
fail() { echo "${RED}Error:${NC} $*" >&2; exit 1; }

show_help() {
    cat <<'EOF'

Uso: ./release.sh <minor|middle|mayor> [opciones]

Segmentos (X.Y.Z):
  mayor    aumenta X   (primera)     1.1.3  ->  2.1.3
  middle   aumenta Y   (del medio)   1.0.3  ->  1.1.3
  minor    aumenta Z   (ultima)      1.0.2  ->  1.0.3

Opciones:
  --set X.Y.Z     Usa una version exacta en lugar de calcularla
  --semver        Reinicia los segmentos inferiores (1.0.2 middle -> 1.1.0)
  --dry-run       Muestra lo que haria, sin tocar nada
  -y, --yes       No pide confirmacion
  --no-push       Crea commit y tag locales, no hace push (no despliega)
  --allow-dirty   Permite continuar con cambios sin commitear
  -h, --help      Muestra esta ayuda

Ejemplos:
  ./release.sh minor              # 1.0.2 -> 1.0.3
  ./release.sh middle             # 1.0.3 -> 1.1.3
  ./release.sh mayor -y           # 1.1.3 -> 2.1.3  (sin confirmar)
  ./release.sh minor --dry-run    # simulacion
  ./release.sh --set 2.0.0        # version exacta

El push del tag vX.Y.Z dispara el release de produccion en GitHub Actions.

EOF
    exit 1
}

bump=""
forced_version=""
reset_lower=0
dry_run=0
assume_yes=0
do_push=1
allow_dirty=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        minor|middle|mayor) bump="$1"; shift ;;
        --set)              forced_version="${2:-}"; shift 2 ;;
        --semver)           reset_lower=1; shift ;;
        --dry-run)          dry_run=1; shift ;;
        -y|--yes)           assume_yes=1; shift ;;
        --no-push)          do_push=0; shift ;;
        --allow-dirty)      allow_dirty=1; shift ;;
        -h|--help)          show_help ;;
        *)                  echo "Argumento desconocido: $1"; show_help ;;
    esac
done

[[ -z "$bump" && -z "$forced_version" ]] && show_help
[[ -n "$bump" && -n "$forced_version" ]] && fail "Usa un segmento o --set, no ambos."

run() {
    if [[ $dry_run -eq 1 ]]; then
        echo "   ${YELLOW}[dry-run]${NC} $*"
    else
        "$@"
    fi
}

# --- Validaciones del repositorio --------------------------------------------

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "No estas dentro de un repositorio git."
cd "$(git rev-parse --show-toplevel)"
[[ -f package.json ]] || fail "No se encontro package.json en la raiz del repositorio."

branch="$(git rev-parse --abbrev-ref HEAD)"

if [[ $allow_dirty -eq 0 && -n "$(git status --porcelain)" ]]; then
    echo ""
    git status --short
    echo ""
    fail "Hay cambios sin commitear. Haz commit primero o usa --allow-dirty."
fi

if git remote get-url origin >/dev/null 2>&1; then
    info "Sincronizando tags con origin..."
    git fetch --tags --quiet origin || warn "No se pudo hacer fetch de origin (continuo con datos locales)."
fi

# --- Version base: la mayor entre el ultimo tag y package.json ----------------

pkg_version="$(sed -nE '0,/"version"/s/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json)"
[[ -n "$pkg_version" ]] || fail "No se pudo leer la version de package.json."

tag_version="$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' | sed 's/^v//' | sort -V | tail -1)"

if [[ -n "$tag_version" ]]; then
    base_version="$(printf '%s\n%s\n' "$pkg_version" "$tag_version" | sort -V | tail -1)"
else
    base_version="$pkg_version"
fi

[[ "$base_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Version base invalida: '$base_version' (se espera X.Y.Z)."

# --- Calculo de la nueva version ---------------------------------------------

if [[ -n "$forced_version" ]]; then
    [[ "$forced_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "--set espera el formato X.Y.Z (recibido: '$forced_version')."
    new_version="$forced_version"
else
    IFS='.' read -r X Y Z <<< "$base_version"
    case "$bump" in
        mayor)
            X=$((X + 1))
            if [[ $reset_lower -eq 1 ]]; then Y=0; Z=0; fi
            ;;
        middle)
            Y=$((Y + 1))
            if [[ $reset_lower -eq 1 ]]; then Z=0; fi
            ;;
        minor)
            Z=$((Z + 1))
            ;;
    esac
    new_version="${X}.${Y}.${Z}"
fi

new_tag="v${new_version}"

# --- El tag no debe existir --------------------------------------------------

if git rev-parse -q --verify "refs/tags/${new_tag}" >/dev/null; then
    fail "El tag ${new_tag} ya existe localmente."
fi

if git remote get-url origin >/dev/null 2>&1; then
    if [[ -n "$(git ls-remote --tags origin "refs/tags/${new_tag}" 2>/dev/null)" ]]; then
        fail "El tag ${new_tag} ya existe en origin."
    fi
fi

# --- Resumen y confirmacion --------------------------------------------------

push_label="si"
if [[ $do_push -eq 0 ]]; then push_label="no (--no-push)"; fi

echo ""
echo "=============================================="
echo " Rama            : ${branch}"
echo " package.json    : ${pkg_version}"
echo " Ultimo tag      : ${tag_version:-(ninguno)}"
echo " Version base    : ${base_version}"
echo " Nueva version   : ${GREEN}${new_version}${NC}   (${bump:-set})"
echo " Tag a publicar  : ${GREEN}${new_tag}${NC}"
echo " Push a origin   : ${push_label}"
echo "=============================================="
echo ""

if [[ "$branch" != "main" ]]; then
    warn "Estas en '${branch}'. Produccion normalmente se libera desde 'main'."
fi

if [[ $do_push -eq 1 && $dry_run -eq 0 ]]; then
    warn "El push de ${new_tag} DESPLIEGA A PRODUCCION (chatcenter.imporfactory.app)."
fi

if [[ $assume_yes -eq 0 && $dry_run -eq 0 ]]; then
    if [[ ! -t 0 ]]; then
        fail "Sin terminal interactiva. Usa -y para confirmar automaticamente."
    fi
    read -r -p "Continuar? [s/N] " answer
    case "$answer" in
        s|S|si|SI|Si|y|Y|yes) ;;
        *) echo "Cancelado."; exit 0 ;;
    esac
    echo ""
fi

# --- Actualizar package.json (y package-lock.json) ---------------------------

info "Actualizando package.json a ${new_version}..."
if command -v npm >/dev/null 2>&1; then
    if [[ $dry_run -eq 0 ]]; then
        npm version "$new_version" --no-git-tag-version --allow-same-version >/dev/null
    else
        echo "   ${YELLOW}[dry-run]${NC} npm version ${new_version} --no-git-tag-version"
    fi
else
    warn "npm no disponible: se edita solo package.json."
    if [[ $dry_run -eq 0 ]]; then
        tmp="$(mktemp)"
        sed -E "0,/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]+\"/s//\"version\": \"${new_version}\"/" package.json > "$tmp"
        mv "$tmp" package.json
    else
        echo "   ${YELLOW}[dry-run]${NC} sed version -> ${new_version} en package.json"
    fi
fi

# --- Commit, tag y push ------------------------------------------------------

info "Creando commit de release..."
run git add package.json
if [[ -f package-lock.json ]]; then run git add package-lock.json; fi

if [[ $dry_run -eq 0 ]]; then
    if git diff --cached --quiet; then
        warn "No hay cambios que commitear (la version ya estaba en ${new_version})."
    else
        git commit -m "chore(release): ${new_tag}"
    fi
else
    echo "   ${YELLOW}[dry-run]${NC} git commit -m \"chore(release): ${new_tag}\""
fi

info "Creando tag anotado ${new_tag}..."
run git tag -a "$new_tag" -m "$new_tag"

if [[ $do_push -eq 1 ]]; then
    info "Subiendo rama ${branch}..."
    run git push origin "$branch"
    info "Subiendo tag ${new_tag}..."
    run git push origin "$new_tag"
else
    warn "Sin push. Para publicar despues:"
    echo "    git push origin ${branch} && git push origin ${new_tag}"
fi

echo ""
if [[ $dry_run -eq 1 ]]; then
    ok "Simulacion completada. Version resultante: ${new_version}"
else
    ok "Release ${new_tag} generado."
    if [[ $do_push -eq 1 ]]; then
        echo "  Workflow : https://github.com/DesarrolloImporfactory/chatcenter-front/actions"
        echo "  Release  : https://github.com/DesarrolloImporfactory/chatcenter-front/releases/tag/${new_tag}"
    fi
fi
echo ""
