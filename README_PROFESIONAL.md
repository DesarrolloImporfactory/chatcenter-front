# 🚀 ChatCenter Business Messenger

> Professional messaging platform that facilitates secure business communication between companies and TikTok users.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/DesarrolloImporfactory/chatcenter-front)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646cff.svg)](https://vitejs.dev/)
[![TikTok Business](https://img.shields.io/badge/TikTok-Business%20API-ff0050.svg)](https://developers.tiktok.com/)

## 📋 Tabla de Contenidos

- [🎯 Sobre el Proyecto](#-sobre-el-proyecto)
- [✨ Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [⚙️ Configuración](#️-configuración)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔌 Integraciones](#-integraciones)
- [🛡️ Seguridad](#️-seguridad)
- [📚 API](#-api)
- [🎨 UI/UX](#-uiux)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📄 Documentación Legal](#-documentación-legal)
- [🤝 Contribuir](#-contribuir)

## 🎯 Sobre el Proyecto

**ChatCenter Business Messenger** es una plataforma profesional de mensajería empresarial que se integra con **TikTok Business API** para facilitar la comunicación directa entre empresas y usuarios de TikTok.

### ❌ Lo que NO hacemos:

- NO creamos contenido para TikTok
- NO distribuimos videos o contenido multimedia
- NO influimos en el algoritmo de TikTok
- NO accedemos a contenido público de usuarios
- NO proporcionamos servicios de marketing de contenido

### ✅ Lo que SÍ hacemos:

- Facilitamos mensajería directa entre empresas y usuarios de TikTok
- Proporcionamos herramientas de gestión de conversaciones
- Ofrecemos integración oficial con TikTok Business API
- Garantizamos cumplimiento con regulaciones de protección de datos

## ✨ Características

### 🏢 **Para Empresas**

- **Dashboard Centralizado**: Gestiona todas las conversaciones desde un solo lugar
- **Múltiples Integraciones**: TikTok, WhatsApp, y más plataformas
- **Gestión de Equipos**: Asigna conversaciones a diferentes departamentos
- **Reportes y Analytics**: Estadísticas detalladas de rendimiento
- **Plantillas de Respuesta**: Respuestas rápidas personalizables

### 🔒 **Seguridad y Cumplimiento**

- **Encriptación E2E**: Todos los mensajes están encriptados
- **Cumplimiento GDPR/CCPA**: Totalmente compatible con regulaciones
- **Auditoría Completa**: Logs detallados de todas las actividades
- **Autenticación Robusta**: OAuth 2.0 + JWT con refresh tokens
- **Rate Limiting**: Protección contra abuso y spam

### 🎨 **Experiencia de Usuario**

- **Diseño Responsive**: Funciona en desktop, tablet y móvil
- **Tema Personalizable**: Colores y branding de tu empresa
- **Notificaciones Real-time**: Alertas instantáneas de nuevos mensajes
- **Interfaz Intuitiva**: Diseñada para máxima productividad

## 🏗️ Arquitectura

### **Arquitectura de Frontend**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  React Components | Pages | Layouts | UI Components        │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  Custom Hooks | Services | Utilities | State Management    │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  API Services | Auth Service | Socket.IO | HTTP Client     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│  TikTok Business API | WhatsApp API | Backend Services     │
└─────────────────────────────────────────────────────────────┘
```

### **Patrones de Diseño Implementados**

- ✅ **Single Responsibility Principle**: Cada componente tiene una única responsabilidad
- ✅ **Dependency Injection**: Servicios inyectados mediante contexto y hooks
- ✅ **Observer Pattern**: Eventos en tiempo real con Socket.IO
- ✅ **Factory Pattern**: Creación de instancias de API clients
- ✅ **Singleton Pattern**: Servicios únicos como AuthService
- ✅ **Strategy Pattern**: Diferentes estrategias de autenticación

## 🚀 Inicio Rápido

### **Prerrequisitos**

```bash
node.js >= 18.0.0
npm >= 9.0.0
```

### **Instalación**

```bash
# 1. Clonar el repositorio
git clone https://github.com/DesarrolloImporfactory/chatcenter-front.git
cd chatcenter-front

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env

# 4. Configurar variables de entorno (ver sección Configuración)
nano .env

# 5. Iniciar en modo desarrollo
npm run dev

# 6. Construir para producción
npm run build
```

### **Acceso Rápido**

- **Frontend**: http://localhost:5173
- **Políticas TikTok**: http://localhost:5173/politicas-tiktok
- **Callback TikTok**: http://localhost:5173/auth/tiktok/callback

## ⚙️ Configuración

### **Variables de Entorno Esenciales**

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api/v1
VITE_socket=http://localhost:3001

# TikTok Business
VITE_TIKTOK_CLIENT_KEY=your_client_key
VITE_TIKTOK_REDIRECT_URI=http://localhost:5173/auth/tiktok/callback

# Feature Flags
VITE_ENABLE_TIKTOK=true
VITE_ENABLE_WHATSAPP=true
```

### **Configuración de TikTok Business**

1. **Crear App en TikTok for Developers**

   - Ir a https://developers.tiktok.com/
   - Crear nueva aplicación
   - Configurar productos: Login Kit

2. **Configurar Redirect URIs**

   ```bash
   # Desarrollo
   http://localhost:5173/auth/tiktok/callback

   # Producción
   https://tu-dominio.com/auth/tiktok/callback
   ```

3. **Scopes Requeridos**
   - `user.info.basic`: Información básica del usuario

## 📁 Estructura del Proyecto

```
src/
├── 📁 api/                     # Clientes HTTP y configuración de API
│   └── chatcenter.js          # Cliente principal con interceptors
├── 📁 auth/                    # Sistema de autenticación
│   └── AuthService.js         # Servicio centralizado de auth
├── 📁 components/              # Componentes reutilizables
│   ├── 📁 layout/             # Layouts principales
│   ├── 📁 shared/             # Componentes compartidos
│   └── 📁 [feature]/          # Componentes por característica
├── 📁 config/                  # Configuración centralizada
│   └── index.js               # Configuración de la app
├── 📁 hooks/                   # Custom hooks
│   ├── useSocket.js           # Hook para Socket.IO
│   └── useTikTokConnection.js # Hook para TikTok
├── 📁 pages/                   # Páginas de la aplicación
│   ├── 📁 auth/               # Páginas de autenticación
│   ├── 📁 politicas/          # Documentos legales
│   └── 📁 [feature]/          # Páginas por característica
├── 📁 services/                # Servicios de negocio
├── 📁 store/                   # Estado global (Redux)
│   └── 📁 slices/             # Slices de Redux Toolkit
├── 📁 utils/                   # Utilidades y helpers
│   └── notifications.js       # Sistema de notificaciones
└── 📁 assets/                  # Recursos estáticos
```

## 🔌 Integraciones

### **TikTok Business Integration**

```javascript
// Hook para conexión con TikTok
const { isConnected, connectToTikTok, disconnectFromTikTok } =
  useTikTokConnection();

// Conectar
const handleConnect = () => {
  connectToTikTok();
};

// Estado de conexión
if (isConnected) {
  // Usuario conectado con TikTok
}
```

### **Socket.IO Real-time**

```javascript
// Hook para Socket.IO
const { socket, online, emit, on } = useSocket();

// Escuchar mensajes
useEffect(() => {
  const cleanup = on("new_message", (message) => {
    // Manejar nuevo mensaje
  });

  return cleanup;
}, [on]);

// Enviar mensaje
const sendMessage = (content) => {
  emit("send_message", { content, recipient });
};
```

### **Sistema de Notificaciones**

```javascript
import { notify } from "../utils/notifications";

// Notificaciones por tipo
notify.success("¡Operación exitosa!");
notify.error("Error en la operación");
notify.warning("Advertencia importante");
notify.info("Información relevante");

// Notificaciones especializadas
notify.connection.connected("TikTok");
notify.message.sent();
notify.file.uploading("documento.pdf");
```

## 🛡️ Seguridad

### **Autenticación y Autorización**

- ✅ **JWT Tokens**: Tokens firmados con expiración
- ✅ **Refresh Tokens**: Renovación automática de sesiones
- ✅ **OAuth 2.0**: Integración segura con TikTok
- ✅ **CSRF Protection**: Protección contra ataques CSRF
- ✅ **XSS Prevention**: Sanitización de inputs

### **Protección de Datos**

- ✅ **Encriptación en Tránsito**: TLS 1.3 para todas las comunicaciones
- ✅ **Encriptación en Reposo**: AES-256 para datos sensibles
- ✅ **Sanitización**: Limpieza de todos los inputs de usuario
- ✅ **Rate Limiting**: Límites de peticiones por usuario/IP
- ✅ **Audit Logs**: Registro completo de actividades

### **Cumplimiento Normativo**

- 🇪🇺 **GDPR**: Reglamento General de Protección de Datos
- 🇺🇸 **CCPA**: Ley de Privacidad del Consumidor de California
- 🇪🇨 **LOPD Ecuador**: Ley de Protección de Datos de Ecuador
- 📱 **TikTok Policies**: Cumplimiento con políticas de TikTok Business

## 📚 API

### **Estructura de Respuestas**

```typescript
// Respuesta exitosa
{
  "success": true,
  "data": {
    // Datos de respuesta
  },
  "message": "Operación exitosa"
}

// Respuesta de error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje de error",
    "details": {}
  }
}
```

### **Endpoints Principales**

```bash
# Autenticación
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/tiktok/callback

# Integraciones
GET    /api/v1/integrations/tiktok/status
POST   /api/v1/integrations/tiktok/connect
DELETE /api/v1/integrations/tiktok/disconnect
POST   /api/v1/integrations/tiktok/refresh

# Mensajería
GET    /api/v1/messages
POST   /api/v1/messages
PUT    /api/v1/messages/:id
DELETE /api/v1/messages/:id

# Usuarios
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
GET    /api/v1/users/permissions
```

## 🎨 UI/UX

### **Sistema de Diseño**

```scss
// Colores principales
:root {
  --primary: #0075ff;
  --secondary: #6b7280;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}

// Tipografía
font-family: "Inter", system-ui, sans-serif;

// Espaciado
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 3rem;
```

### **Componentes Reutilizables**

- ✅ **Button**: Botones con múltiples variantes
- ✅ **Input**: Campos de entrada con validación
- ✅ **Modal**: Modales centralizados
- ✅ **Toast**: Notificaciones temporales
- ✅ **Loading**: Indicadores de carga
- ✅ **Avatar**: Avatares de usuario
- ✅ **Badge**: Insignias y etiquetas
- ✅ **Card**: Tarjetas de contenido

### **Responsive Design**

```css
/* Mobile First */
@media (min-width: 640px) {
  /* sm */
}
@media (min-width: 768px) {
  /* md */
}
@media (min-width: 1024px) {
  /* lg */
}
@media (min-width: 1280px) {
  /* xl */
}
```

## 🧪 Testing

### **Estrategia de Testing**

```bash
# Instalar dependencias de testing
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Ejecutar tests
npm run test

# Coverage
npm run test:coverage

# Tests de integración
npm run test:integration
```

### **Tipos de Tests**

- ✅ **Unit Tests**: Componentes y funciones individuales
- ✅ **Integration Tests**: Interacción entre componentes
- ✅ **E2E Tests**: Flujos completos de usuario
- ✅ **API Tests**: Endpoints y respuestas
- ✅ **Security Tests**: Vulnerabilidades y ataques

## 🚀 Deployment

### **Build de Producción**

```bash
# Construir aplicación
npm run build

# Verificar build
npm run preview

# Analizar bundle
npm run analyze
```

### **Variables de Producción**

```bash
# Production Environment
VITE_API_URL=https://api.chatcenter.imporsuit.ec/api/v1
VITE_socket=https://api.chatcenter.imporsuit.ec
VITE_TIKTOK_REDIRECT_URI=https://chatcenter.imporsuit.ec/auth/tiktok/callback
VITE_NODE_ENV=production
```

### **Deployment Options**

#### **Vercel (Recomendado)**

```bash
npm install -g vercel
vercel --prod
```

#### **Netlify**

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

#### **Docker**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### **CDN y Optimizaciones**

- ✅ **Code Splitting**: División automática de código
- ✅ **Tree Shaking**: Eliminación de código no usado
- ✅ **Compression**: Gzip/Brotli para assets
- ✅ **Caching**: Cache estratégico de recursos
- ✅ **Lazy Loading**: Carga bajo demanda de componentes

## 📄 Documentación Legal

### **Políticas Implementadas**

- 📋 **[Política de Privacidad TikTok](/politica-privacidad-tiktok)**
- 📋 **[Términos de Servicio TikTok](/terminos-servicio-tiktok)**
- 📋 **[Índice de Políticas TikTok](/politicas-tiktok)**

### **Características Legales**

- ✅ **Cumplimiento GDPR**: Derechos de usuarios europeos
- ✅ **Cumplimiento CCPA**: Derechos de usuarios de California
- ✅ **Políticas TikTok**: Adherencia a términos de TikTok Business
- ✅ **Transparencia**: Información clara sobre tratamiento de datos
- ✅ **Consentimiento**: Gestión explícita de consentimientos
- ✅ **Derechos de Usuario**: Ejercicio de derechos ARCO

## 🤝 Contribuir

### **Guidelines de Contribución**

1. **Fork el repositorio**
2. **Crear branch de feature**: `git checkout -b feature/nueva-feature`
3. **Commit cambios**: `git commit -m 'Add: nueva característica'`
4. **Push al branch**: `git push origin feature/nueva-feature`
5. **Crear Pull Request**

### **Estándares de Código**

```bash
# ESLint
npm run lint

# Prettier
npm run format

# Type checking
npm run type-check
```

### **Convenciones**

- ✅ **Commits**: Usar conventional commits
- ✅ **Naming**: camelCase para variables, PascalCase para componentes
- ✅ **Testing**: Mínimo 80% de cobertura
- ✅ **Documentation**: JSDoc para funciones complejas
- ✅ **Performance**: Lazy loading para rutas

---

## 📞 Soporte y Contacto

- **🌐 Website**: [https://imporsuit.ec](https://imporsuit.ec)
- **📧 Email**: info@imporfactoryusa.com
- **🛡️ DPO**: dpo@imporsuit.ec
- **💬 Soporte**: soporte@imporsuit.ec

---

<div align="center">

### ⭐ Si te gusta este proyecto, ¡dale una estrella!

**Desarrollado con ❤️ por [Imporfactory](https://imporsuit.ec)**

_Professional Business Messaging • TikTok Integration • GDPR Compliant_

</div>
