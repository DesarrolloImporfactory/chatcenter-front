# Políticas de TikTok para ImporChat

Este directorio contiene las páginas legales específicas para el uso de **ImporChat** con la plataforma **TikTok**.

## 📋 Páginas Creadas

### 1. Política de Privacidad para TikTok

**Archivo:** `PoliticaPrivacidadTikTok.jsx`  
**Ruta:** `/politica-privacidad-tiktok`

**Características:**

- ✅ Específica para servicios de mensajería (NO contenido)
- ✅ Cumple con GDPR, CCPA y regulaciones de Ecuador
- ✅ Clara distinción entre datos que SE recopilan y NO se recopilan
- ✅ Integración específica con TikTok Business API
- ✅ Procedimientos detallados para ejercer derechos de usuarios
- ✅ Medidas de seguridad técnicas y organizacionales

**Secciones Incluidas:**

1. Resumen Ejecutivo
2. Responsable del Tratamiento
3. Información que Recopilamos
4. Cómo Usamos su Información
5. Compartir Información
6. Integración con TikTok
7. Retención de Datos
8. Seguridad
9. Sus Derechos
10. Menores de Edad
11. Transferencias Internacionales
12. Cambios a esta Política
13. Contacto

### 2. Términos de Servicio para TikTok

**Archivo:** `TerminosServicioTikTok.jsx`  
**Ruta:** `/terminos-servicio-tiktok`

**Características:**

- ✅ Términos específicos para mensajería empresarial
- ✅ Clara delimitación de usos permitidos y prohibidos
- ✅ Responsabilidades del usuario y limitaciones del servicio
- ✅ Integración con políticas de TikTok Business
- ✅ Procedimientos de facturación y suspensión
- ✅ Limitaciones de responsabilidad apropiadas

**Secciones Incluidas:**

1. Definiciones
2. Aceptación de Términos
3. Descripción del Servicio
4. Elegibilidad
5. Registro y Cuenta
6. Uso Permitido
7. Uso Prohibido
8. Integración con TikTok
9. Responsabilidades del Usuario
10. Limitaciones del Servicio
11. Facturación y Pagos
12. Suspensión y Terminación
13. Propiedad Intelectual
14. Limitación de Responsabilidad
15. Indemnización
16. Fuerza Mayor
17. Jurisdicción y Ley Aplicable
18. Modificaciones
19. Contacto

### 3. Página Índice de Políticas TikTok

**Archivo:** `PoliticasTikTokIndex.jsx`  
**Ruta:** `/politicas-tiktok`

**Características:**

- ✅ Página de navegación para ambos documentos
- ✅ Explicación clara de qué hace y NO hace ImporChat
- ✅ Información sobre cumplimiento normativo
- ✅ Enlaces de contacto legal

## 🎯 Enfoque del Servicio

### ✅ Lo que SÍ hace ImporChat:

- Facilita mensajería directa entre empresas y usuarios de TikTok
- Proporciona herramientas de gestión de conversaciones
- Ofrece integración oficial con TikTok Business API
- Garantiza cumplimiento con regulaciones de protección de datos

### ❌ Lo que NO hace ImporChat:

- NO crea contenido para TikTok
- NO distribuye videos o contenido multimedia
- NO influye en el algoritmo de TikTok
- NO accede a contenido público de usuarios
- NO proporciona servicios de marketing de contenido

## 🏛️ Cumplimiento Normativo

Las políticas cumplen con:

### 🇪🇺 Regulaciones Europeas

- **GDPR** (Reglamento General de Protección de Datos)
- **ePrivacy Directive**
- **Digital Services Act**

### 🇺🇸 Regulaciones de EE.UU.

- **CCPA** (California Consumer Privacy Act)
- **CAN-SPAM Act**
- **COPPA** (Children's Online Privacy)

### 🇪🇨 Regulaciones de Ecuador

- **Ley de Protección de Datos Personales**
- **Ley de Comercio Electrónico**
- **Regulaciones de ARCOTEL**

### 📱 Políticas de TikTok

- **TikTok Business Terms**
- **TikTok API Guidelines**
- **Community Guidelines**

## 🛠️ Implementación Técnica

### Rutas Configuradas:

```jsx
// En App.jsx
<Route path="/politicas-tiktok" element={<PoliticasTikTokIndex />} />
<Route path="/politica-privacidad-tiktok" element={<PoliticaPrivacidadTikTok />} />
<Route path="/terminos-servicio-tiktok" element={<TerminosServicioTikTok />} />
```

### Imports Agregados:

```jsx
import PoliticaPrivacidadTikTok from "./pages/politicas/PoliticaPrivacidadTikTok";
import TerminosServicioTikTok from "./pages/politicas/TerminosServicioTikTok";
import PoliticasTikTokIndex from "./pages/politicas/PoliticasTikTokIndex";
```

### Estilos:

- Utiliza el archivo CSS existente: `politicas.css`
- Mantiene consistencia visual con el resto de la aplicación
- Diseño responsive y accesible

## 📞 Contacto Legal

Para consultas sobre estas políticas específicas de TikTok:

- **📧 Email Principal:** info@imporfactoryusa.com
- **🛡️ Delegado de Protección de Datos:** dpo@imporsuit.ec
- **⚖️ Consultas Legales:** Usar asunto "TikTok Legal"
- **🕒 Tiempo de Respuesta:** Máximo 30 días calendario

## 🔗 Enlaces Útiles

- **Página Principal de Políticas TikTok:** `/politicas-tiktok`
- **Política de Privacidad TikTok:** `/politica-privacidad-tiktok`
- **Términos de Servicio TikTok:** `/terminos-servicio-tiktok`
- **Política de Privacidad General:** `/politica-privacidad`
- **Términos Generales:** `/condiciones-servicio`

## 📝 Notas de Desarrollo

1. **Mantenimiento:** Revisar y actualizar políticas cada 6 meses o cuando cambien regulaciones
2. **Versionado:** Mantener registro de cambios con fechas de actualización
3. **Traducciones:** Considerar traducciones a inglés para clientes internacionales
4. **Validación Legal:** Revisar con asesor legal antes de cambios significativos

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0  
**Desarrollado por:** Imporfactory para ImporChat
