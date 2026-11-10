# Mac mini del radar (ImporKiller barriendo Meta 24/7)

Guía para dejar una Mac mini (M1, sin monitor) barriendo la Biblioteca de anuncios de Meta
con la extensión ImporKiller, sin que nadie la supervise. Pensada para hacerla una sola vez
con pantalla, teclado y mouse prestados (o un TV), y después manejarla desde la laptop.

Si vas a usar Claude Code en la Mac, abre una terminal en la raíz del repo y dile:
«Lee extension/espia-tiendas/MAC-RADAR.md y haz los pasos 2 y 3; los del 4 en adelante
los hago yo con la pantalla». No tiene el contexto de esta conversación: el archivo es el contexto.

## 1. Primer arranque (con pantalla)

1. Asistente de macOS: crea el usuario (por ejemplo `radar`), **sin** activar FileVault
   (si lo activas, el inicio de sesión automático no funciona y tras un corte de luz la Mac
   queda esperando una clave).
2. Conéctala por cable de red si puedes; por Wi-Fi funciona igual.
3. Ajustes > General > Compartir > **Compartir pantalla** activado. Anota la IP
   (Ajustes > Red). Desde ahí ya puedes seguir desde la laptop en la misma red con RealVNC Viewer.

## 2. Terminal: Claude Code y el repo

```bash
xcode-select --install        # git (acepta el diálogo)
curl -fsSL https://claude.ai/install.sh | bash
mkdir -p ~/imporchat && cd ~/imporchat
git clone https://github.com/DesarrolloImporfactory/chatcenter-front.git
cd chatcenter-front && git checkout develop
```

La extensión vive en `extension/espia-tiendas` y se carga descomprimida desde ahí.
Actualizarla = `git pull` + «Recargar» en `chrome://extensions`.

## 3. Terminal: dejar la Mac sin dormir y Chrome sin frenar

```bash
bash extension/espia-tiendas/mac-radar.sh
```

Hace esto (pide la clave una vez):

- `pmset`: nunca duerme, arranca sola tras un corte de luz, despierta por red.
- Apaga las actualizaciones automáticas de macOS (para que no se reinicie de noche).
- Instala Chrome si falta (Homebrew).
- Políticas de Chrome: Ahorro de memoria apagado, «continuar donde lo dejé», y
  facebook.com / chat.imporfactory.app exentos de descarte de pestañas. Se ven en `chrome://policy`.
- Chrome en los ítems de inicio.
- Compartir pantalla activado para el usuario actual.

Al final imprime la lista de lo que solo se hace con la pantalla (sección 4).

## 4. Con la pantalla (o por control remoto)

1. Ajustes > Usuarios y grupos > **Iniciar sesión automáticamente** como este usuario.
2. Ajustes > Pantalla bloqueada > «Solicitar contraseña…» → **Nunca**.
3. Chrome > `chrome://extensions` > Modo de desarrollador > **Cargar descomprimida** >
   `~/imporchat/chatcenter-front/extension/espia-tiendas`. Si hay una versión vieja, quítala antes.
4. **Ventana 1**: `https://chatcenter.imporfactory.app`, inicia sesión con el super administrador
   del radar. La extensión toma la sesión y la cambia sola por una **sesión larga de 90 días que se
   renueva sola** (icono de la extensión → «sesión larga hasta …»). Esa pestaña puede quedar atrás.
5. **Ventana 2, al frente y con una sola pestaña**: Biblioteca de anuncios
   `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EC&media_type=all`
   → panel ImporKiller → **Radar** → Automático → marcar países → **Iniciar**.
   Chrome frena los temporizadores de las pestañas que no están al frente: por eso ventana propia.
6. **Chrome Remote Desktop** para entrar desde fuera de casa/oficina:
   `https://remotedesktop.google.com/access` → Configurar acceso remoto → instalar → PIN →
   dar permisos de Accesibilidad y Grabación de pantalla cuando macOS los pida.
   Desde la laptop: la misma URL con la misma cuenta de Google.
7. Conecta el **HDMI fantasma** (dummy plug, ~$8) y desconecta el monitor. Sin él macOS deja una
   pantalla virtual diminuta y el control remoto se ve mal. Teclado y mouse ya no hacen falta.

## 5. Qué revisar a diario (desde la laptop, sin tocar la Mac)

- Portada de `https://chatcenter.imporfactory.app/imporkiller` (como super admin): la fila del
  recolector dice **«Radar barriendo EC 120/300 · hace 2 min»** (o esperando la próxima vuelta).
  La extensión manda ese latido cada 10 min y cada vez que cambia de estado.
- Si hay que ir al equipo, la portada lo dice arriba con un aviso:
  - **En pausa**: Meta pidió una verificación (captcha, «confirma que eres humano»). Es lo único que
    detiene el radar solo. Conectas el monitor, la resuelves en la pestaña de la Biblioteca y pulsas
    **Reanudar**. El aviso cuenta cuántas veces pasó en 30 días: con eso decides si vale la pena el
    acceso remoto desde la laptop.
  - **Sin señal**: más de 25 min sin latido con el radar en marcha. Mac apagada, Chrome cerrado o la
    pestaña se perdió. Todo lo demás (Meta en blanco, IMPORCHAT caído, sesión) lo reintenta solo.
- La sesión larga muere si alguien pulsa **Cerrar sesión** con ese usuario en Imporsuit o IMPORCHAT
  (cierre único). Cerrar pestañas o apagar la laptop no la afecta. Si pasa, volver a iniciar sesión
  en la ventana 1 de la Mac y la extensión la vuelve a alargar sola.

## 6. Qué NO hace la Mac

El catálogo de Dropi lo lee el **servidor** de noche (crons por país); la Mac solo barre Meta.
Las cuentas de Dropi se registran en IMPORCHAT → ImporKiller → «Cuentas de mapeo».

## 7. Consumo

Mac mini M1: 6,8 W en reposo, 39 W a tope (datos de Apple). Barriendo Meta sin parar anda en
10 a 15 W, es decir 7 a 11 kWh al mes. En Ecuador (unos $0,10/kWh con cargos) son **$0,70 a $1,10
al mes**. Un monitor encendido consumiría el doble o el triple que la Mac: por eso el HDMI fantasma.
