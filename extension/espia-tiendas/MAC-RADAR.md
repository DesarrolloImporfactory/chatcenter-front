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

## 5.1 Diagnóstico pendiente: el radar se calló el 09-11-2026 a las 22:53

Sección para Claude Code corriendo **en la Mac del radar**. Dile: «Lee
extension/espia-tiendas/MAC-RADAR.md y haz el diagnóstico de la sección 5.1». No tienes el
contexto de la conversación donde se investigó desde el servidor: lo que sigue es todo lo que se sabe.

**Reglas mientras diagnosticas**

- Primero se junta la evidencia, después se toca. **No recargues** la pestaña de la Biblioteca, **no
  pulses «Recargar»** en `chrome://extensions`, no cierres Chrome y no reinicies la Mac hasta terminar
  los pasos 1 a 5: cualquiera de esas cosas revive el radar y borra el rastro.
- Solo lectura. No cambies ajustes del sistema ni de Chrome, no hagas commit ni push.
- En el almacenamiento de la extensión está el token de la sesión: **nunca lo imprimas ni lo copies**
  a ningún lado (los comandos de abajo ya lo filtran). El repo es público.

**Lo que se vio desde el servidor (horas de Ecuador)**

| Hora (09-11) | Qué pasó |
| --- | --- |
| 20:58 | Primer latido: radar corriendo en EC, extensión 0.6.5, modo automático. |
| 21:05 y 21:13–21:24 | Dos productos devolvieron «El cuerpo de la petición es demasiado grande» (lotes de más de 100 KB). Pasaron solos tras 1 y 5 reintentos. Arreglado en la 0.6.6 (lotes por peso). |
| ~21:10 | Alguien trabajaba en esta Mac con Claude Code (se creó la tarea de ClickUp del error de arriba). |
| 21:24–22:53 | Barrido parejo, unos 19 productos cada 10 min, sin un solo fallo. |
| 22:46:16 | **Último latido**: «corriendo», EC 167/300. |
| 22:53:24 | **Último producto guardado** (iba por el 181 de 300). Después, nada. |

Descartado desde el servidor: el backend estaba arriba y la ruta del latido responde; la cuenta del
radar no está suspendida ni tiene cierre de sesión registrado; **nunca llegó un estado «pausado»**, que
es lo que la extensión manda cuando detecta una verificación de Meta. Al día siguiente (10-11, ~08:30)
la pantalla estaba encendida y sin bloqueo, la pestaña de la Biblioteca abierta y sin nada raro a la
vista, y había un aviso del sistema pidiendo la clave de iMessage/iCloud.

O sea: el radar se cortó entre un producto y el siguiente, sin degradarse antes, y **ni siquiera el
latido de cada 10 min volvió a salir**. El latido es un `setInterval` dentro de `barra.js`; que también
se haya callado dice que el script de la pestaña dejó de correr (o de poder hablar con la extensión),
no que el radar decidiera parar.

**Hipótesis, de más a menos probable**

1. **Se recargó o actualizó la extensión con el radar andando.** Al pulsar «Recargar» en
   `chrome://extensions` el `barra.js` que ya estaba en la pestaña queda huérfano («Extension context
   invalidated»): `chrome.storage` y `chrome.runtime` lanzan error, el bucle muere sin avisar y la
   página se ve normal. Encaja con que alguien estuvo trabajando en la extensión esa noche.
2. **Chrome congeló o frenó la pestaña** (pantalla apagada a los 10 min sin uso por `pmset
   displaysleep 10`, ventana tapada, App Nap, Ahorro de memoria). El último uso de teclado o mouse
   hacia las 22:43 daría justo un apagado de pantalla a las 22:53.
3. **La Mac durmió o perdió la red** a esa hora.
4. **Alguien pulsó algo** en el panel (Pausar o Detener deberían haber mandado latido; si no hay red,
   no llega).
5. **Meta sacó la pestaña de la Biblioteca** a una página de inicio de sesión o verificación. Fuera
   de `/ads/library/` la extensión no corre y no puede avisar. Poco probable: la pestaña amaneció en la
   Biblioteca.

**Pasos**

1. Qué hizo la Mac entre las 22:40 y las 23:05 del 09-11 (sueño, pantalla, red):

   ```bash
   uptime; last reboot | head -3
   pmset -g custom | sed -n '1,25p'
   pmset -g log | grep -E "^2026-11-09 2[23]:" | grep -Ei "sleep|wake|display is turned|darkwake" | head -40
   log show --start "2026-11-09 22:40:00" --end "2026-11-09 23:05:00" \
     --predicate 'eventMessage CONTAINS[c] "display" OR eventMessage CONTAINS[c] "en0" OR process == "Google Chrome"' \
     --style compact 2>/dev/null | tail -60
   ```

   «Display is turned off» a las 22:5x apunta a la hipótesis 2; un «Sleep» a la 3.

2. Si alguien tocó la extensión esa noche:

   ```bash
   cd ~/chatcenter-front 2>/dev/null || cd ~/imporchat/chatcenter-front
   pwd; git status -sb; git log -3 --format='%h %ci %s' | cut -c1-110
   git reflog -8 --date=iso | cut -c1-110
   stat -f '%Sm  %N' extension/espia-tiendas/*.js extension/espia-tiendas/manifest.json
   ```

   Un `pull`, un cambio de rama o archivos modificados cerca de las 22:5x, junto con la hipótesis 1.
   Mira también el historial de la terminal (`~/.zsh_history`) y las sesiones de Claude Code de esa
   noche si las hay.

3. En qué estado quedó el radar según la propia extensión (sin abrir Chrome). El estado vive en
   `chrome.storage.local`, que en disco es un LevelDB por perfil:

   ```bash
   CH="$HOME/Library/Application Support/Google/Chrome"
   # El id de la extensión: la carpeta de ajustes que menciona «radarLatido».
   grep -l "radarLatido" "$CH"/*/"Local Extension Settings"/*/*.log "$CH"/*/"Local Extension Settings"/*/*.ldb 2>/dev/null
   # Con la carpeta que salga (ojo: quita el token antes de mostrar nada):
   DIR="<carpeta que salió arriba, sin el nombre del archivo>"
   strings -n 6 "$DIR"/*.log "$DIR"/*.ldb | grep -v -i "token" \
     | grep -E '"(activo|pausado|idx|hecho|error|descansoHasta|fallos|descansos|pais|inicio)"|radarLatido|firma' | tail -40
   ```

   Interesan: `activo`, `pausado`, `idx` (debería rondar 181), `error`, `descansoHasta` y la `firma`
   y hora (`en`, en milisegundos) del último latido. Si `idx` sigue en ~181 y `activo` es true, el
   radar cree que sigue corriendo: se quedó colgado, nadie lo detuvo.

4. Red y backend desde esta Mac (tiene que responder **401**, no un error de conexión):

   ```bash
   curl -s -m 15 -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST https://chat.imporfactory.app/api/v1/espia/radar/latido
   ```

5. Lo que solo ve una persona en la pantalla. Pídele estas cuatro cosas, en este orden, y anótalas:

   - Texto exacto del panel ImporKiller en la pestaña de la Biblioteca («Radar 181/300…»,
     «descansando hasta…», un error en rojo) y la dirección completa de esa pestaña.
   - En esa pestaña: clic derecho → Inspeccionar → Consola. ¿Hay errores en rojo? El que confirma la
     hipótesis 1 es **«Extension context invalidated»**.
   - `chrome://extensions` → ImporKiller: versión, si aparece el botón **Errores** y qué dice, y la
     ruta de «Cargada desde».
   - `chrome://discards`: la fila de la pestaña de la Biblioteca (columnas de estado y «Last active»);
     y `chrome://policy`: que sigan las políticas de `mac-radar.sh`.

6. Recién ahora, revivirlo: recarga la pestaña de la Biblioteca. El radar debe retomar solo desde el
   producto donde quedó y a los pocos minutos la portada de ImporKiller debe mostrar el latido.
   Si no retoma, ese es otro dato: anota qué dice el panel.

**Qué entregar**

Un resumen corto: cuál hipótesis quedó confirmada y con qué evidencia (la línea del log, el error de
la consola, el estado guardado), cuáles quedaron descartadas, y qué no se pudo comprobar. Si nada
cierra, dilo así; no completes con suposiciones. No arregles nada por tu cuenta: el arreglo se decide
con el resultado.

**Arreglos que ya se sabe que hacen falta (para quien retome)**

- El latido debería vivir en `bg.js` (el service worker) y no en la pestaña: hoy, si el script de la
  pestaña muere por cualquiera de las hipótesis 1, 2 o 5, se lleva el latido con él y la portada solo
  puede decir «sin señal» sin saber por qué.
- Si se confirma la 1: `barra.js` debe notar el contexto invalidado y recargar la pestaña sola.
- Aviso de iMessage/iCloud: no detiene a Chrome. Si esa Mac no usa el Apple ID, se quita cerrando
  sesión en Mensajes → Ajustes → iMessage y en Ajustes del Sistema → (nombre) → Cerrar sesión.
- Sigue pendiente «Iniciar sesión automáticamente» (sección 4.1).

## 5.2 Actualizar la extensión en esta Mac

`git pull` en el repo y **Recargar** en `chrome://extensions`; después recarga la pestaña de la
Biblioteca (el script viejo de la pestaña queda huérfano al recargar la extensión). **No la quites
para volver a cargarla**: quitarla borra la sesión larga, la configuración del radar y por dónde iba.
Si el `pull` responde «Invalid username or token», el token de GitHub del llavero venció: hace falta
uno nuevo.

## 6. Qué NO hace la Mac

El catálogo de Dropi lo lee el **servidor** de noche (crons por país); la Mac solo barre Meta.
Las cuentas de Dropi se registran en IMPORCHAT → ImporKiller → «Cuentas de mapeo».

## 7. Consumo

Mac mini M1: 6,8 W en reposo, 39 W a tope (datos de Apple). Barriendo Meta sin parar anda en
10 a 15 W, es decir 7 a 11 kWh al mes. En Ecuador (unos $0,10/kWh con cargos) son **$0,70 a $1,10
al mes**. Un monitor encendido consumiría el doble o el triple que la Mac: por eso el HDMI fantasma.
