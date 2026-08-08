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
6. Para una versión, actualizar `package.json`, hacer merge y crear un tag semántico (`v1.1.0`).
7. El tag genera una GitHub Release con el contenido de `dist/` empaquetado y, tras la aprobación del Environment, lo despliega a producción.

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

| Ambiente | Evento | URL | Protección |
| --- | --- | --- | --- |
| `staging` | merge a `main` | URL de pruebas | automático |
| `production` | tag `vX.Y.Z` | URL pública | aprobación manual |

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

Cada despliegue debe registrar tag, SHA, actor y ambiente. Para rollback, volver a publicar el artefacto de la última GitHub Release estable; no reconstruir un commit antiguo con dependencias nuevas.

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

# Publicar una versión después de actualizar package.json y hacer merge
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```
