# Proceso CI/CD de ChatCenter Frontend

## Objetivo

Todo cambio llega a producción de forma revisable, reproducible y recuperable. GitHub es la fuente de verdad y `main` representa código listo para desplegar.

Este repositorio usa **npm** y `package-lock.json` como fuente de verdad del CI. No actualizar `pnpm-lock.yaml` en cambios de dependencias; conviene retirarlo en una limpieza posterior para evitar instalaciones distintas entre equipos.

## Flujo de trabajo

1. Crear una rama corta desde `main`: `feat/descripcion`, `fix/descripcion` o `chore/descripcion`.
2. Abrir un pull request hacia `main`.
3. CI instala exactamente `package-lock.json`, genera el build y conserva el artefacto durante 7 días.
4. Requerir CI aprobado y al menos una revisión antes del merge.
5. Usar squash merge y un título estilo Conventional Commits, por ejemplo `feat: agrega filtros al dashboard`.
6. El merge a `main` dispara `Deploy production`: compila con los secrets del Environment `production` y publica el bundle en el servidor.
7. Para desplegar de nuevo el estado actual de `main` sin nuevos commits, usar **Run workflow** (`workflow_dispatch`) en `Deploy production`.

## Configuración de GitHub recomendada

En **Settings > Branches > Branch protection rules**, proteger `main` con:

- pull request obligatorio;
- una aprobación como mínimo;
- conversación resuelta antes del merge;
- status check obligatorio: `Build production bundle`;
- rama actualizada antes del merge;
- bloquear force-push y eliminación;
- aplicar las reglas también a administradores.

En **Settings > Actions > General**, mantener permisos por defecto de solo lectura. El workflow de release solicita explícitamente escritura únicamente para publicar la versión.

## Ambientes y despliegue

El despliegue automático depende del proveedor que sirve el frontend. Al conectarlo, usar dos GitHub Environments:

| Ambiente | Workflow | Evento | URL |
| --- | --- | --- | --- |
| `development` | `Deploy development` | push a `develop` | `https://dev.imporfactory.app/` |
| `production` | `Deploy production` | push/merge a `main` | `https://chatcenter.imporfactory.app/` |

Ambos aceptan también ejecución manual (`workflow_dispatch`). `CI` solo corre en pull requests: el build de `main` ya lo hace el propio despliegue, así que no se duplica.

El despliegue de staging solo comienza cuando CI aprueba el SHA de `main`; recompila exactamente ese SHA con el lockfile. Producción compila y publica el mismo bundle dentro de un único job de release. Guardar host y credenciales FTP en secrets del Environment correspondiente. Añadir un smoke test HTTP cuando se confirme la URL pública y conservar la versión anterior para rollback.

Secrets existentes esperados:

- `staging`: `FTP_HOST`, `FTP_USER`, `FTP_PASS`;
- `production`: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

## Variables y seguridad

Vite incorpora al JavaScript público cualquier variable con prefijo `VITE_`. Por eso:

- nunca guardar secretos, contraseñas, JWT secrets ni client secrets como `VITE_*`;
- mantener secretos de OAuth en el backend;
- usar en el frontend únicamente URLs, identificadores públicos y feature flags;
- no copiar `.env` a GitHub; configurar por ambiente solo los valores públicos requeridos durante el build.

El ejemplo del repositorio no declara secretos `VITE_*`. El backend debe manejar cualquier intercambio OAuth que requiera un client secret. Se encontró un token estático previamente escrito en `src/services/imporsuit/README.md`; fue retirado del documento, pero debe rotarse en el servidor y eliminarse del frontend porque el historial Git y los bundles existentes pueden conservarlo.

## Versionado y rollback

Usar SemVer:

- `patch` para correcciones compatibles;
- `minor` para funcionalidad compatible;
- `major` para cambios incompatibles.

Cada despliegue guarda en el servidor los archivos que reemplaza, en `/var/www/chatcenter-front/releases/<sha-corto>`. Para rollback inmediato, restaurar ese directorio sobre `dist/`:

```bash
sudo -u deploychatcenter rsync -a --delete \
  /var/www/chatcenter-front/releases/<sha-corto>/ \
  /var/www/chatcenter-front/dist/
```

Para un rollback permanente, revertir el commit en `main`: el push vuelve a disparar el despliegue con el código anterior.

## Próximas puertas de calidad

El repositorio todavía no tiene ESLint configurado ni suite de pruebas, aunque el README los menciona. Incorporarlos de forma gradual antes de convertirlos en checks obligatorios:

1. configurar ESLint y corregir la base existente;
2. añadir Vitest y React Testing Library para lógica crítica;
3. añadir Playwright para login y un flujo principal;
4. establecer cobertura mínima solo después de crear una línea base real;
5. ejecutar auditoría de dependencias en un workflow programado, separada del camino crítico de cada PR.

## Comandos operativos

```bash
npm ci --no-audit --no-fund
npm run build

# Desplegar a producción: merge a main (o Run workflow en Deploy production)
git checkout main && git merge --no-ff develop && git push origin main
```

## Permisos en el servidor

El despliegue entra por SSH como `deploychatcenter` y `deployfront`. Todo el árbol servido debe pertenecer a ese usuario; si algún archivo quedó como `root` o `www-data`, rsync falla con `Permission denied` y deja el despliegue a medias (`index.html` nuevo con assets viejos). Corregir una sola vez, como root:

```bash
sudo chown -R deploychatcenter:www-data /var/www/chatcenter-front
sudo find /var/www/chatcenter-front -type d -exec chmod 2755 {} +
sudo find /var/www/chatcenter-front -type f -exec chmod 644 {} +
```

El bit setgid (`2755`) hace que los archivos nuevos hereden el grupo `www-data`, que es el que necesita nginx para leerlos. Los workflows envían `--no-owner --no-group --omit-dir-times --chmod=D755,F644` para no intentar cambiar propietario ni grupo, algo que un usuario sin privilegios no puede hacer.

## Script de versionado (`release.sh`)

`release.sh` **ya no despliega**: el despliegue depende solo de `main`. Sigue siendo útil para dejar registro de versiones — actualiza `package.json` y `package-lock.json`, crea el commit `chore(release): vX.Y.Z` y el tag anotado.

| Comando | Segmento que aumenta | Ejemplo |
| --- | --- | --- |
| `./release.sh minor` | `Z`, el último | `1.0.2` → `1.0.3` |
| `./release.sh middle` | `Y`, el del medio | `1.0.3` → `1.1.3` |
| `./release.sh mayor` | `X`, el primero | `1.1.3` → `2.1.3` |

La versión base es la mayor entre el último tag `vX.Y.Z` del repositorio y la versión de `package.json`, de modo que ambos se mantienen sincronizados aunque se desalineen.

Por defecto solo se aumenta el segmento indicado, sin reiniciar los inferiores. Para el comportamiento SemVer estricto (`1.0.2` + `middle` → `1.1.0`), añadir `--semver`.

```bash
./release.sh minor --dry-run    # simula sin tocar nada
./release.sh middle -y          # sin confirmación interactiva
./release.sh mayor --no-push    # commit y tag locales, sin publicar nada
./release.sh --set 2.0.0        # versión exacta
./release.sh --help             # todas las opciones
```

El script aborta si el árbol de trabajo está sucio (`--allow-dirty` lo omite) o si el tag ya existe local o remotamente.

Ejecutarlo sobre `main` hace push del commit `chore(release)` a `main`, y eso **sí** dispara un despliegue de producción (por el commit, no por el tag). Para versionar sin desplegar, usar `--no-push` o ejecutarlo sobre `develop`.
