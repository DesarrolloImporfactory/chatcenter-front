# Handoff — Integración Cartera Imporsuit en ChatCenter

Contexto completo de la funcionalidad **"Cartera del cliente"** que se agregó a
chatcenter para gestionar (desde el chat) la cartera de un cliente en Imporsuit:
buscarlo por correo, crearlo si no existe, asignar paquetes/cursos, ver/crear su
cartera, **agregar deudas, registrar pagos** (con subida de comprobantes a S3).

> Es **cartera real** de Imporsuit: tablas `carteras` + `cuenta_por_pagar` +
> `cartera_pagos`. **NO** es Wallet/billeteras/solicitudes.

---

## 1. Arquitectura (clave)

```
chatcenter-front (React/Vite)
   │  Authorization: Bearer <TOKEN ÚNICO compartido>   (mismo valor en ambos lados)
   ▼
new.imporsuitpro.com/Carterachat/*   ← controlador PHP NUEVO e independiente
   │  reusa AsesorModel / UsuariosModel (sin modificarlos)
   ▼
carteras · cuenta_por_pagar · cartera_pagos · users   (DB imporsuitpro_new)
```

Decisiones tomadas (importante respetarlas):
- **APIs "libres" con un único token compartido** (API key), NO JWT por usuario
  ni SSO. Cualquier agente de chatcenter puede operar, sin tener cuenta en
  Imporsuit. El check "¿tiene cuenta?" es sobre el **CLIENTE** (su correo).
- **No se tocó nada existente**: ni `Asesor/*`, ni `Usuarios/*`, ni el
  `ChatCenter`/socket. Todo vive en un controlador nuevo `Carterachat`.
- El comprobante de pago se sube a **S3 (uploader.imporfactory.app)** — el mismo
  bucket que usa el panel Asesor de `imporsuit-front`.

---

## 2. Repos involucrados

| Repo | Rol | Qué se tocó |
|---|---|---|
| `d:\chatcenter-front` | Front (React/Vite/axios) | **Todo lo nuevo del front** (este doc) |
| `d:\imporsutipro` | Backend PHP (MVC propio) | **Controlador nuevo** `Carterachat` + `CarterachatModel` |
| `d:\imporsuit\imporsuit-front` | Panel Asesor (referencia) | Nada — solo se copió lógica/estilos |
| `d:\socket` | Backend Node de chatcenter | Nada — NO se usa en este enfoque |

---

## 3. Backend — `d:\imporsutipro` (controlador `Carterachat`)

Archivos nuevos (aislados, no tocan nada):
- `Controllers/Carterachat.php`
- `Models/CarterachatModel.php` (solo la query `buscar_por_correo`; el resto
  reusa `AsesorModel`/`UsuariosModel` vía `loadModelInstance`).

**Auth:** header `Authorization: Bearer <CHATCENTER_API_TOKEN>`, comparado con
`hash_equals` contra `$_ENV['CHATCENTER_API_TOKEN']` (método privado
`autenticar()`). Sin sesión, sin JWT por usuario.

**Endpoints** (router por convención `/<Controller>/<metodo>/<param>`):

| Método | Ruta | Body / Param | Qué hace |
|---|---|---|---|
| POST | `/Carterachat/buscar_cliente` | `{correo}` | `{exists, data:{id_users,id_cartera,flags...}}` |
| GET  | `/Carterachat/cursos` | — | cursos activos |
| POST | `/Carterachat/crear_cliente` | `{nombre,correo,telefono,rol,<flags>,cursos?}` | crea/actualiza cliente |
| GET  | `/Carterachat/cliente/{id}` | id_users | datos del usuario |
| GET  | `/Carterachat/deudas/{uuid}` | uuid cartera | deudas + pagos |
| POST | `/Carterachat/generar_cartera` | `{id_users}` | crea cartera |
| POST | `/Carterachat/agregar_deuda` | `{concepto,monto,id_cartera,tipo_venta,fecha_limite,id_asesor,launch_id?}` | crea deuda |
| POST | `/Carterachat/agregar_pago` | `{id_cpp,monto_pagado,fecha_pago,medio_pago,referencia?,imagenes_urls?}` | registra pago |
| POST | `/Carterachat/eliminar_deuda` | `{id_cpp}` | borra deuda sin pagos |

**Respuestas:** envelope legacy `{status, message, ...}` con HTTP 200 incluso en
error (el front desempaca con `unwrap()` y revienta si `status >= 400`).

**CORS:** el `.htaccess` de Imporsuit ya manda `Access-Control-Allow-Origin`
(`*` u origen permitido) + `Authorization`. Funciona porque el front llama **sin
cookies** (`withCredentials:false`). No se tocó.

---

## 4. Frontend — `d:\chatcenter-front`

### Mapa de archivos (todos nuevos salvo los 3 paneles de chat)

| Archivo | Rol |
|---|---|
| `src/api/imporsuit.js` | axios con baseURL `VITE_IMPORSUIT_URL` + Bearer fijo |
| `src/services/imporsuit/uploader.js` | sube archivos a S3 (uploader.imporfactory.app) |
| `src/services/imporsuit/cartera.service.js` | buscar/deudas/generar/agregar/pagar/eliminar |
| `src/services/imporsuit/usuarios.service.js` | cursos + crear cliente |
| `src/services/imporsuit/constants.js` | roles, paquetes, medios, **ASESORES**, **CARTERA_CONFIGS_HABILITADAS** |
| `src/services/imporsuit/index.js` | barrel |
| `src/services/imporsuit/README.md` | doc del centralizado |
| `src/components/imporsuit/CarteraImporsuitSection.jsx` | **botón en el panel + gate por id_configuracion + abre el modal** |
| `src/components/imporsuit/CarteraClientePanel.jsx` | **mini-vista** (buscar, ficha, deudas con filtro+paginador) |
| `src/components/imporsuit/useCarteraCliente.js` | hook de estado |
| `src/components/imporsuit/CrearUsuarioForm.jsx` | modal crear/asignar paquetes+cursos |
| `src/components/imporsuit/AgregarDeudaForm.jsx` | modal nueva deuda (con **selector de asesor**) |
| `src/components/imporsuit/RegistrarPagoForm.jsx` | modal pago (con **uploader** de comprobantes) |
| `src/components/imporsuit/ComprobantesUploader.jsx` | drag&drop de archivos a S3 |

### Dónde está montado
La sección está dentro del panel **"Información del cliente"**:
`DatosUsuarioModerno.jsx` → `ChatRightPanel.jsx` → renderiza
`DropshipperClientPanel.jsx` **o** `BasicClientPanel.jsx`; en **ambos** se
renderiza `<CarteraImporsuitSection>` debajo de la ficha del cliente. El correo
sale de `selectedChat.email_cliente`.

### Comportamiento de la UI
- Es un **botón** "Cartera del cliente → Abrir" que abre un **modal grande**
  (los formularios crear/deuda/pago se abren por encima, z-index escalonado).
- **Búsqueda automática** al abrir (usa el correo del chat).
- Deudas en **tarjetas responsive**, con **filtro** Impagas/Pagadas/Todas (default
  Impagas; si no hay, Todas) y **paginador** (5 por página), **ordenadas por
  fecha de creación** (más reciente primero).
- Botón **Pagar** solo en deudas pendientes → modal con **uploader de
  comprobantes** (sube a S3, muestra miniaturas, manda URLs en `imagenes_urls`).
- Al **crear** un cliente nuevo (correo no encontrado), el modal pre-carga
  **nombre, correo y teléfono** del chat actual (`selectedChat.nombre_cliente`,
  `email_cliente`, `celular_cliente`). El teléfono se normaliza a `+<número>`.
  El agente puede editarlos antes de guardar. (Solo aplica a "Crear usuario"; al
  asignar paquetes a uno existente NO se sobrescribe con datos del chat.)

### Gate por configuración (IMPORTANTE)
La sección **solo se muestra si `id_configuracion` ∈ `CARTERA_CONFIGS_HABILITADAS`**
(en `constants.js`). Hoy: `[237]`. Para habilitar más configuraciones, agregá el
id a ese array. El gate vive en `CarteraImporsuitSection.jsx` (`return null` si no
aplica).

### Asesores (selector en "Agregar deuda")
`ASESORES` en `constants.js` — el `id` es `id_users` de Imporsuit y se manda como
`id_asesor` (FK a `users.id_users`). Actual:
`9884 Sin Asesor · 5753 Kathy Mallitaxi · 9262 Diego · 5752 Adrián Velez`.

---

## 5. Setup (⚠️ requerido para que funcione)

### `d:\imporsutipro\.env`
```dotenv
CHATCENTER_API_TOKEN=131e6297e92c8d57bdf00ae82c9ad1db0e3d1394c3941a893da6ca3941ca8f45
CHATCENTER_ASESOR_ID=0
```
`CHATCENTER_ASESOR_ID` es solo fallback; las deudas usan el asesor del selector.

### `d:\chatcenter-front\.env`
```dotenv
VITE_IMPORSUIT_URL=https://new.imporsuitpro.com
VITE_IMPORSUIT_CHATCENTER_TOKEN=131e6297e92c8d57bdf00ae82c9ad1db0e3d1394c3941a893da6ca3941ca8f45
```
> El token debe ser **idéntico** en ambos. Tras editar el `.env` del front,
> **reiniciar `npm run dev`** (Vite solo lee env al arrancar).

---

## 6. Gotchas / cosas a saber

- **`id_asesor` es FK a `users.id_users`**: si se manda 0 o un id inexistente, la
  BD tira `1452 FK constraint`. Por eso el selector de asesor es obligatorio y el
  back corta con 400 si no hay asesor válido.
- **Token en el bundle del front**: es visible para quien inspeccione el JS.
  Aceptable para uso interno. Si se requiere blindar, proxiar por el socket
  (no implementado, para no tocarlo).
- **Cliente existente en `crear_cliente`**: SOBRESCRIBE los flags de paquete con
  lo que se mande, y NO devuelve `id_users`. El front pre-carga los flags
  actuales (vía `buscar_cliente`) y refresca por correo.
- **`id_cartera`**: `0` (número) si no tiene cartera; si tiene, es el `uuid`.
- **No usar el nombre "Chatcenter"** para nada nuevo en imporsutipro: colisiona
  con el controlador `ChatCenter` existente (PHP class case-insensitive + FS
  Windows). Por eso el controlador se llama `Carterachat`.
- **Código muerto**: un commit previo (`feat(asesor): Mini vista para imporchat`)
  dejó métodos JWT (`buscar_por_correo`, `cursos_disponibles`,
  `crear_usuario_full`) dentro de `Asesor.php`/`AsesorModel.php`. El front ya
  **no** los usa (usa `Carterachat`). Se pueden borrar en un cleanup aparte.

---

## 6.bis Auditoría — quién hizo cada cosa

Se registra **quién** (qué subusuario/agente de chatcenter) ejecutó cada acción
de cartera desde el panel del chat, con qué parámetros, y se consulta desde una
**página admin global**. Registra **éxitos y fallos**.

**Por qué / cómo está acotado:** el log se graba **dentro** de los endpoints
`Carterachat/*`, que solo los llama la mini-vista de cartera (vía `imporsuitApi`,
que no se usa en ningún otro lado). La página admin es solo lectura.

### Actor (identidad del agente)
No hay JWT por usuario hacia Imporsuit (token compartido). El front arma el actor
desde el JWT de chatcenter (`localStorage.token`) en
`src/services/imporsuit/actor.js` → `getActorChatcenter()` y lo manda al backend
en el **body** (`_cc_actor`) vía un **interceptor** de `imporsuitApi`
(`src/api/imporsuit.js`). Va por body y **no** por header a propósito: el
`.htaccess` de Imporsuit solo permite `Content-Type, Authorization` en CORS — un
header custom rompería el preflight. `CarteraImporsuitSection` setea
`setCarteraCtx({id_configuracion, correo})` al abrir, para enriquecer el log.

> ⚠️ El actor es **atribución**, no seguridad (cualquiera con el token podría
> falsearlo). Suficiente para auditoría interna, consistente con el enfoque.

### Backend (`d:\imporsutipro`, todo dentro de `Carterachat`)
- Migración `migrations/chatcenter_cartera_auditoria.sql` — tabla
  `chatcenter_cartera_auditoria` (denormalizada, **sin FK**: los ids de actor son
  de la BD de chatcenter, no de imporsuit).
- `CarterachatModel`: `registrar_auditoria()`, `listar_auditoria()` (paginado +
  filtros) y `resolver_cliente()` (denormaliza `correo_cliente`/`id_users`).
- `Carterachat`: `actorDesdeBody()` + `auditar()` (try/catch: **nunca** rompe la
  operación real), llamadas tras cada una de las 5 mutaciones (y en los
  early-returns de validación), y endpoint lector
  `POST /Carterachat/auditoria { accion?, resultado?, actor_id_sub_usuario?,
  desde?, hasta?, search?, page?, limit? }`.
- `agregar_pago` lanza excepción ante errores de negocio → se audita el fallo en
  un try/catch y se re-lanza para que `catchAsync` responda como siempre.
- `eliminar_deuda` resuelve el cliente **antes** del DELETE (después el id_cpp ya
  no existe).

### Frontend (`d:\chatcenter-front`)
- `src/services/imporsuit/auditoria.service.js` → `listarAuditoria(filtros)`.
- `src/pages/auditoria/AuditoriaCarteraView.jsx` — vista admin (mirror de
  `AdminUsuarios`): filtros (acción, resultado, fechas, search), paginación,
  tabla y **modal de detalle** (JSON de params). Ruta `/auditoria-cartera` en
  `App.jsx` (`MainLayout_conexiones`) + ítem de menú en `MainLayout_conexiones.jsx`.
- **Gate:** `super_administrador` (el backend usa token compartido, así que el
  control de acceso es en el front; ajustable a `gestor_clientes` si se requiere).
- `constants.js`: `ACCIONES_AUDITORIA` (labels/iconos por acción).

### Setup
- **Correr la migración** en `imporsuitpro_new`. No requiere env nuevo (reusa el
  token compartido + `VITE_IMPORSUIT_URL`).

---

## 7. Pendientes / ideas futuras

- Proxiar el token por el backend (socket) si se quiere que no sea extraíble.
- Tema oscuro para la mini-vista (hoy es una tarjeta clara dentro del panel oscuro).
- Sumar más `id_configuracion` a `CARTERA_CONFIGS_HABILITADAS` cuando se habilite
  en otras cuentas.
- Whitelistear `id_asesor` en el back contra la lista real de asesores (hoy
  acepta cualquier id positivo).

---

## 8. Changelog / commits sugeridos (para el PR)

### `d:\imporsutipro` (backend)
- **Nuevos:** `Controllers/Carterachat.php`, `Models/CarterachatModel.php`
- Commit sugerido:
  `feat(carterachat): APIs libres para chatcenter (token compartido, sin tocar Asesor/Usuarios)`
- ⚠️ `Asesor.php`/`AsesorModel.php` tienen métodos JWT viejos (`buscar_por_correo`,
  `cursos_disponibles`, `crear_usuario_full`) de un commit previo — **código muerto**,
  el front ya usa `Carterachat`. Opcional:
  `chore(asesor): remover endpoints chatcenter no usados`.

### `d:\chatcenter-front` (front)
- **Nuevos:**
  - `src/api/imporsuit.js`
  - `src/services/imporsuit/{uploader,cartera.service,usuarios.service,constants,index}.js` + `README.md`
  - `src/components/imporsuit/{CarteraImporsuitSection,CarteraClientePanel,useCarteraCliente,CrearUsuarioForm,AgregarDeudaForm,RegistrarPagoForm,ComprobantesUploader}.jsx`
  - `docs/HANDOFF-cartera-imporsuit.md`
- **Modificados** (montaje + gate):
  - `src/components/chat/ChatRightPanel.jsx`
  - `src/components/chat/DropshipperClientPanel.jsx`
  - `src/components/chat/BasicClientPanel.jsx`
- Commit sugerido:
  `feat(cartera): mini-vista de cartera Imporsuit en el panel del cliente (config 237)`

### `d:\socket`
- **Sin cambios** (se descartó el enfoque SSO / token por usuario).

### Config (NO va al repo)
- `.env` de ambos repos: `CHATCENTER_API_TOKEN` / `VITE_IMPORSUIT_CHATCENTER_TOKEN`
  (mismo valor) + `CHATCENTER_ASESOR_ID`. Ver sección 5.
