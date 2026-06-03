# Integración Imporsuit (cartera + clientes) en ChatCenter

Centralizado para consumir Imporsuit desde chatcenter mediante **APIs libres con
un único token compartido** (API key), sin tocar nada existente.

Permite, desde el chat: **buscar al CLIENTE por correo**, crearlo si no existe,
asignarle paquetes/cursos, ver si tiene cartera, y registrar deudas y pagos.

> Solo usa `carteras` + `cuenta_por_pagar` + `cartera_pagos`.
> **No** toca `Wallet`/`billeteras`/`solicitudes`, ni `Asesor/*`, ni `ChatCenter`,
> ni el `issue-imporsuit-token` del socket.

---

## Arquitectura (token único, sin SSO)

```
chatcenter (front)
   │  Authorization: Bearer <CHATCENTER_API_TOKEN>   (token fijo, igual en ambos lados)
   ▼
new.imporsuitpro.com/Carterachat/*   ← controlador NUEVO e independiente
   │  reusa AsesorModel / UsuariosModel (sin modificarlos)
   ▼
carteras · cuenta_por_pagar · cartera_pagos · users
```

El check de *"¿tiene cuenta?"* es sobre el **correo del CLIENTE** (no del agente).

---

## Endpoints (controlador `Carterachat` en imporsutipro)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/Carterachat/buscar_cliente` | `{correo}` → `{exists, data:{id_users, id_cartera, flags...}}` |
| GET  | `/Carterachat/cursos` | Cursos activos |
| POST | `/Carterachat/crear_cliente` | Crea/actualiza cliente con paquetes + cursos |
| GET  | `/Carterachat/cliente/{id}` | Datos del usuario |
| GET  | `/Carterachat/deudas/{uuid}` | Deudas + pagos de la cartera |
| POST | `/Carterachat/generar_cartera` | `{id_users}` → crea cartera |
| POST | `/Carterachat/agregar_deuda` | Registra deuda |
| POST | `/Carterachat/agregar_pago` | Registra pago/abono |
| POST | `/Carterachat/eliminar_deuda` | `{id_cpp}` |

Archivos backend (nuevos, aislados): `Controllers/Carterachat.php`, `Models/CarterachatModel.php`.

---

## Configuración (⚠️ requerido)

### 1. Imporsuit — `d:\imporsutipro\.env`
```dotenv
CHATCENTER_API_TOKEN=131e6297e92c8d57bdf00ae82c9ad1db0e3d1394c3941a893da6ca3941ca8f45
CHATCENTER_ASESOR_ID=0
```
- `CHATCENTER_API_TOKEN`: el token compartido (cambialo por uno propio si querés).
- `CHATCENTER_ASESOR_ID`: id_users del asesor al que se atribuyen las deudas
  creadas desde chatcenter. Opcional para buscar/ver cartera; ponelo (tu id de
  admin) si querés que las deudas queden con asesor.

### 2. ChatCenter — `d:\chatcenter-front\.env`
```dotenv
VITE_IMPORSUIT_URL=https://new.imporsuitpro.com
VITE_IMPORSUIT_CHATCENTER_TOKEN=131e6297e92c8d57bdf00ae82c9ad1db0e3d1394c3941a893da6ca3941ca8f45
```
> El valor de `VITE_IMPORSUIT_CHATCENTER_TOKEN` debe ser **idéntico** a
> `CHATCENTER_API_TOKEN`. Tras editarlo, **reiniciá `npm run dev`** (Vite solo lee
> env al arrancar).

---

## Uso

```jsx
import { CarteraClientePanel } from "../components/imporsuit/CarteraClientePanel";
<CarteraClientePanel correoInicial={cliente.email_cliente} onClose={cerrar} />
```

O directo el servicio:
```js
import { buscarPorCorreo } from "../services/imporsuit";
const { exists, data } = await buscarPorCorreo("cliente@mail.com");
```

Ya está montado como sección colapsable **"Cartera del cliente"** dentro del
panel "Información del cliente" (`DropshipperClientPanel` y `BasicClientPanel`).

---

## Mapa de archivos (front)

| Archivo | Rol |
|---|---|
| `src/api/imporsuit.js` | axios con el token fijo (Bearer) |
| `src/services/imporsuit/cartera.service.js` | buscar/deudas/generar/agregar/pagar/eliminar |
| `src/services/imporsuit/usuarios.service.js` | cursos + crear cliente |
| `src/services/imporsuit/constants.js` | roles, paquetes, medios de pago |
| `src/services/imporsuit/index.js` | barrel |
| `src/components/imporsuit/CarteraImporsuitSection.jsx` | sección colapsable en el panel |
| `src/components/imporsuit/CarteraClientePanel.jsx` | mini-vista |
| `src/components/imporsuit/useCarteraCliente.js` | hook |
| `src/components/imporsuit/{CrearUsuarioForm,AgregarDeudaForm,RegistrarPagoForm}.jsx` | modales |

---

## Notas / seguridad

- **El token va embebido en el bundle del front** → es visible para cualquiera
  que inspeccione el JS. Para uso interno/operativo es aceptable. Si necesitás
  que NO sea extraíble, la alternativa es **proxiar** las llamadas por el backend
  de chatcenter (socket) y guardar el token server-side. (No implementado para no
  tocar el socket.)
- **CORS:** el `.htaccess` de Imporsuit ya manda `Access-Control-Allow-Origin`
  (`*` u origen permitido) + `Authorization`; funciona porque llamamos sin
  cookies (`withCredentials:false`). Sin tocar nada.
- **Cliente existente:** `crear_cliente` con un correo ya registrado
  **sobrescribe** los flags de paquete con lo que mandes. La mini-vista pre-carga
  los flags actuales (`buscar_cliente`) para no borrarlos. En ese caso el back
  **no** devuelve `id_users` → se refresca con `buscar_cliente`.
- **`id_cartera`** viene `0` (número) cuando el cliente no tiene cartera; si la
  tiene es el `uuid`.
- **Token inválido/ausente** → la API responde `401 "Token de integración
  inválido"` (envelope), que el front muestra como error.
