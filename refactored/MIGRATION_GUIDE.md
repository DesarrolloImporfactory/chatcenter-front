# 🏗️ MIGRATION GUIDE — ChatCenter Refactoring

## Resumen de Arquitectura

**Patrón:** Feature-Sliced Design + Composition  
**Reglas fundamentales:**
- Ningún componente > 200 líneas
- Cero llamadas a API dentro de componentes (solo en `services/`)
- Cero código duplicado (todo en `shared/`)
- Pages son composición pura (< 50 líneas)

---

## Estructura del Refactored

```
refactored/
├── app/                          # Bootstrap de la aplicación
│   ├── providers.jsx             # Árbol de providers centralizado
│   ├── routes.jsx                # Definición de rutas con lazy loading
│   └── index.js                  # Barrel export
│
├── shared/                       # Código compartido cross-feature
│   ├── api/
│   │   └── chatcenter.js         # Cliente HTTP centralizado (axios)
│   ├── auth/
│   │   ├── AuthService.js        # Singleton: tokens, JWT, login/logout
│   │   └── useAuth.js            # Hook React para auth
│   ├── ui/
│   │   ├── Toast.js              # SweetAlert2 Toast unificado
│   │   ├── PreviewContent.jsx    # Preview multimedia unificado
│   │   ├── Pills.jsx             # Badges reutilizables
│   │   └── index.js              # Barrel export
│   ├── hooks/
│   │   ├── useSpotlight.js       # Tour/spotlight genérico
│   │   └── usePagination.js      # Paginación genérica
│   ├── lib/
│   │   └── formatters.js         # Utilidades de formato
│   └── index.js                  # Barrel export maestro
│
├── features/                     # Dominios de negocio
│   ├── chat/
│   │   ├── services/             # Lógica de API
│   │   │   ├── chatMessageService.js
│   │   │   └── chatConversationService.js
│   │   ├── hooks/                # Estado y lógica React
│   │   │   ├── useMessages.js
│   │   │   ├── useBotToggle.js
│   │   │   └── useTemplateModal.js
│   │   ├── components/           # UI pura
│   │   │   ├── ChatShell.jsx     # Orquestador principal
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── MessageList.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   └── BotSwitch.jsx
│   │   ├── modals/
│   │   │   └── TemplateModal/
│   │   │       ├── index.jsx
│   │   │       ├── TemplateSearch.jsx
│   │   │       ├── TemplatePlaceholders.jsx
│   │   │       └── TemplateScheduler.jsx
│   │   └── index.js
│   │
│   ├── conexiones/
│   │   ├── services/conexionesService.js
│   │   ├── hooks/useConexiones.js
│   │   ├── components/
│   │   │   ├── ConexionesShell.jsx
│   │   │   └── ConexionCard.jsx
│   │   └── index.js
│   │
│   ├── plantillas/
│   │   ├── services/plantillasService.js
│   │   ├── hooks/usePlantillas.js
│   │   └── index.js
│   │
│   └── contactos/
│       ├── services/contactosService.js
│       ├── hooks/useContactos.js
│       └── index.js
│
└── pages/                        # Composición pura (< 50 líneas cada una)
    ├── ChatPage.jsx
    ├── ConexionesPage.jsx
    ├── PlantillasPage.jsx
    └── ContactosPage.jsx
```

---

## Plan de Migración por Fases

### Fase 1 — Shared (Riesgo: BAJO, Impacto: ALTO)

| Archivo viejo | Archivo nuevo | Qué se elimina |
|---|---|---|
| `src/api/chatcenter.js` | `refactored/shared/api/chatcenter.js` | Nada (reemplazar import) |
| `src/auth/AuthService.js` | `refactored/shared/auth/AuthService.js` | Clase duplicada |
| `src/hooks/useAuth.js` | `refactored/shared/auth/useAuth.js` | Hook duplicado |
| Toast inline (17 archivos) | `refactored/shared/ui/Toast.js` | 17 bloques de código idénticos |
| PreviewContent (4 copias) | `refactored/shared/ui/PreviewContent.jsx` | 4 funciones idénticas ~200 líneas c/u |

**Archivos con Toast duplicado a limpiar:**
```
src/pages/admintemplates/AdministradorPlantillas2.jsx
src/components/chat/Modales.jsx
src/components/chat/modales/CrearPlantillaModal.jsx
src/components/chat/modales/EditarPlantillaModal.jsx
src/pages/asistentes/Asistentes.jsx
src/pages/conexiones/Conexiones.jsx
src/pages/conexiones/AdminConexiones.jsx
src/pages/contactos/Estado_contactos_imporfactory.jsx
src/pages/contactos/Estado_contactos_ventas.jsx
src/pages/contactos/Estado_contactos_imporshop.jsx
src/pages/productos/ProductosView.jsx
src/pages/categorias/CategoriasView.jsx
src/pages/usuarios/UsuariosView.jsx
src/pages/departamentos/DepartamentosView.jsx
src/pages/calendario/Calendario.jsx  (si aplica)
src/pages/administradorcanales/AdministradorCanales.jsx
src/components/clientes/Contactos.jsx
```

**Cómo migrar un Toast (ejemplo):**
```diff
- // ANTES (en cada archivo)
- import Swal from 'sweetalert2';
- const Toast = Swal.mixin({
-   toast: true,
-   position: 'top-end',
-   showConfirmButton: false,
-   timer: 3000,
-   timerProgressBar: true,
-   didOpen: (toast) => {
-     toast.onmouseenter = Swal.stopTimer;
-     toast.onmouseleave = Swal.resumeTimer;
-   },
- });

+ // DESPUÉS (una línea)
+ import { Toast } from '@/refactored/shared/ui/Toast';
```

---

### Fase 2 — Features: Chat (Riesgo: MEDIO, Impacto: ALTO)

| Archivo viejo | Archivo nuevo | Líneas eliminadas |
|---|---|---|
| `src/components/chat/ChatPrincipal.jsx` (~2400 líneas) | `features/chat/components/ChatShell.jsx` (~80 líneas) + hooks | ~2300 líneas |
| `src/components/chat/Modales.jsx` (~2700 líneas) | `features/chat/modals/TemplateModal/` (4 archivos) | ~2600 líneas |
| `src/components/chat/DatosUsuario.jsx` (~3189 líneas) | Se divide en múltiples componentes | ~3000 líneas |
| `src/components/chat/Cabecera.jsx` | `features/chat/components/ChatHeader.jsx` | Reemplazo directo |
| `src/components/chat/SwitchBot.jsx` | `features/chat/components/BotSwitch.jsx` | Reemplazo directo |
| `src/components/chat/Sidebar.jsx` | `features/chat/components/` (varios) | Se descompone |
| `src/features/chat/services/messageService.js` | `features/chat/services/chatMessageService.js` | Refactorizado |
| `src/features/chat/services/conversationService.js` | `features/chat/services/chatConversationService.js` | Refactorizado |
| `src/features/chat/hooks/useChat.js` | `features/chat/hooks/useMessages.js` + otros | Se divide |

**Estrategia de migración del Chat:**
1. Empezar por `SwitchBot.jsx` → `BotSwitch.jsx` (reemplazo simple)
2. Luego `Cabecera.jsx` → `ChatHeader.jsx`
3. Extraer hooks de `ChatPrincipal.jsx` uno a uno
4. Migrar los modales de `Modales.jsx` uno a uno
5. Al final, reemplazar `ChatPrincipal.jsx` por `ChatShell.jsx`

---

### Fase 3 — Features: Conexiones (Riesgo: BAJO)

| Archivo viejo | Archivo nuevo |
|---|---|
| `src/pages/conexiones/Conexiones.jsx` | `features/conexiones/` (service + hook + components) |
| Lógica API inline | `features/conexiones/services/conexionesService.js` |

---

### Fase 4 — Features: Plantillas (Riesgo: BAJO)

| Archivo viejo | Archivo nuevo |
|---|---|
| `src/pages/admintemplates/AdministradorPlantillas2.jsx` | `features/plantillas/` (service + hook) |
| API calls inline | `features/plantillas/services/plantillasService.js` |

---

### Fase 5 — Features: Contactos (Riesgo: BAJO)

| Archivo viejo | Archivo nuevo |
|---|---|
| `src/pages/contactos/Estado_contactos_*.jsx` (3 archivos) | `features/contactos/` (service + hook) |
| `src/components/clientes/Contactos.jsx` | Usar `features/contactos/` |

---

### Fase 6 — Pages (Riesgo: BAJO)

Reemplazar los imports en `App.jsx` uno a uno:
```diff
- import Chat from './pages/chat/Chat';
+ import Chat from './refactored/pages/ChatPage';
```

---

### Fase 7 — App Layer (Riesgo: MEDIO, hacer al final)

1. Reemplazar `main.jsx` por versión con `AppProviders`
2. Reemplazar `App.jsx` por `AppRoutes`
3. Eliminar providers duplicados

---

## Cómo Importar Durante la Migración

Mientras coexisten ambas versiones, usen alias o rutas relativas:

```js
// Opción A: ruta relativa
import { Toast } from '../../refactored/shared/ui/Toast';

// Opción B: alias en vite.config.js (RECOMENDADO)
// Agregar en vite.config.js → resolve.alias:
//   '@refactored': path.resolve(__dirname, 'refactored')
// Luego:
import { Toast } from '@refactored/shared/ui/Toast';
```

**Configuración del alias en `vite.config.js`:**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@refactored': path.resolve(__dirname, './refactored'),
    },
  },
});
```

---

## Reglas para Código Nuevo

1. **Máximo 200 líneas por componente.** Si pasa de 200, dividir.
2. **Cero `fetch`/`axios` en componentes.** Todo en `features/[dominio]/services/`.
3. **Cero lógica de negocio en componentes.** Todo en `features/[dominio]/hooks/`.
4. **Cero código duplicado.** Si algo se usa en 2+ features, va a `shared/`.
5. **Pages son composición pura.** Máximo 50 líneas, solo imports y JSX.
6. **Un hook = una responsabilidad.** No hooks de 400 líneas.
7. **Barrel exports** en cada carpeta para imports limpios.
8. **Nombrar archivos por lo que HACEN:** `useBotToggle.js`, no `hook3.js`.

---

## Checklist de Migración

Use esta lista para ir trackeando el progreso:

- [ ] **Fase 1: shared/**
  - [ ] Configurar alias `@refactored` en vite.config.js
  - [ ] Migrar Toast (17 archivos)
  - [ ] Migrar PreviewContent (4 archivos)
  - [ ] Migrar AuthService + useAuth
  - [ ] Migrar chatcenter.js (API client)
  - [ ] Migrar formatters
  - [ ] Migrar useSpotlight
- [ ] **Fase 2: features/chat/**
  - [ ] Migrar SwitchBot → BotSwitch
  - [ ] Migrar Cabecera → ChatHeader
  - [ ] Extraer useMessages de ChatPrincipal
  - [ ] Extraer useBotToggle
  - [ ] Migrar TemplateModal (4 archivos)
  - [ ] Reemplazar ChatPrincipal por ChatShell
  - [ ] Migrar services (message + conversation)
- [ ] **Fase 3: features/conexiones/**
  - [ ] Migrar service
  - [ ] Migrar hook
  - [ ] Migrar components
- [ ] **Fase 4: features/plantillas/**
  - [ ] Migrar service
  - [ ] Migrar hook
- [ ] **Fase 5: features/contactos/**
  - [ ] Migrar service
  - [ ] Migrar hook
- [ ] **Fase 6: Pages**
  - [ ] Reemplazar imports de pages en App.jsx uno a uno
- [ ] **Fase 7: App Layer**
  - [ ] Migrar main.jsx a AppProviders
  - [ ] Migrar App.jsx a AppRoutes
  - [ ] Eliminar archivos viejos que ya no se usen

---

## Métricas de Éxito

| Métrica | Antes | Objetivo |
|---|---|---|
| Archivo más grande | 3,189 líneas (DatosUsuario) | < 200 líneas |
| Toast duplicados | 17 copias | 1 fuente |
| PreviewContent duplicados | 4 copias | 1 fuente |
| JWT decode inline | 10+ archivos | 1 fuente (useAuth) |
| Líneas totales estimadas | ~25,000+ | ~12,000 (−50%) |
| Tiempo para encontrar dónde cambiar algo | 😰 | 😎 |

---

## FAQ

**¿Puedo migrar solo una feature a la vez?**  
Sí, ese es exactamente el diseño. Cada feature es independiente. Empieza por `shared/` (Fase 1) y luego migra features en cualquier orden.

**¿Qué pasa si necesito lógica que está en el viejo y en el nuevo?**  
Durante la transición, el código viejo sigue funcionando. Los archivos nuevos importan del viejo cuando es necesario (ej: `store`, `SocketProvider`). Cuando completes la migración de una pieza, elimina la vieja.

**¿Cómo evito regresiones?**  
Migra ruta por ruta. Prueba cada ruta después de cambiar su import. Si algo falla, el rollback es cambiar el import de vuelta.

**¿Necesito migrar todo para ver beneficios?**  
No. Solo migrar el Toast (Fase 1) ya elimina ~500 líneas duplicadas. Migrar PreviewContent elimina otras ~800 líneas. Los beneficios son inmediatos.
