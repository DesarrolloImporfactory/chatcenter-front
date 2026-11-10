#!/bin/bash
# Deja una Mac (mini M1 o cualquier macOS reciente) lista para que la extensión
# ImporKiller barra la Biblioteca de anuncios de Meta las 24 horas sin nadie delante.
# Léelo entero antes de correrlo: pide la clave de administrador una vez (sudo).
# Lo que NO se puede hacer desde la terminal queda al final como lista a mano.
#
#   bash extension/espia-tiendas/mac-radar.sh
#
set -u
paso() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
USUARIO="$(whoami)"
AQUI="$(cd "$(dirname "$0")" && pwd)"

paso "1. Que la Mac nunca duerma y vuelva sola tras un corte de luz"
# sleep 0: no duerme nunca. displaysleep 10: la pantalla (o el HDMI fantasma) se apaga a los 10 min,
# Chrome sigue corriendo. autorestart 1: arranca sola cuando vuelve la luz. womp 1: despierta por red.
# powernap 0 y ttyskeepawake 1: sin siestas ni dormirse con una terminal abierta.
sudo pmset -a sleep 0 disksleep 0 displaysleep 10 autorestart 1 womp 1 powernap 0 ttyskeepawake 1
pmset -g custom | sed -n '1,20p'

paso "2. Que macOS no se actualice ni reinicie solo de noche"
sudo softwareupdate --schedule off >/dev/null 2>&1 || true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticallyInstallMacOSUpdates -bool false
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool false
sudo defaults write /Library/Preferences/com.apple.commerce AutoUpdate -bool false

paso "3. Sin protector de pantalla (la pantalla se apaga sola por pmset)"
defaults -currentHost write com.apple.screensaver idleTime -int 0

paso "4. Google Chrome"
if [ ! -d "/Applications/Google Chrome.app" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew no está: instalándolo (pide la clave)…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  brew install --cask google-chrome
else
  echo "Chrome ya está instalado."
fi

paso "5. Políticas de Chrome para que no frene ni descarte la pestaña del radar"
# Son políticas «administradas» de Chrome (chrome://policy las muestra). Valen aunque
# alguien toque la configuración a mano, y sobreviven a las actualizaciones de Chrome.
P=com.google.Chrome
defaults write $P HighEfficiencyModeEnabled -bool false     # Ahorro de memoria apagado (Chrome < 126)
defaults write $P MemorySaverModeSavings -int 0             # Ahorro de memoria apagado (Chrome >= 126)
defaults write $P BatterySaverModeAvailability -int 0       # sin ahorro de batería
defaults write $P RestoreOnStartup -int 1                   # al abrir, continúa donde lo dejó (las dos pestañas)
defaults write $P TabDiscardingExceptions -array \
  "facebook.com" "www.facebook.com" \
  "chat.imporfactory.app" "chatcenter.imporfactory.app" "developer.imporfactory.app"
defaults write $P ExtensionDeveloperModeSettings -int 0     # permitir «Cargar descomprimida»
echo "Políticas escritas. Compruébalas en chrome://policy después de reiniciar Chrome."

paso "6. Chrome arranca solo al iniciar sesión"
osascript -e 'tell application "System Events" to if not (exists login item "Google Chrome") then make login item at end with properties {path:"/Applications/Google Chrome.app", hidden:false}' >/dev/null 2>&1 \
  && echo "Chrome agregado a los ítems de inicio." || echo "No pude agregar Chrome a los ítems de inicio: hazlo en Ajustes > General > Ítems de inicio."

paso "7. Compartir pantalla (para entrar desde la laptop en la misma red)"
sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart \
  -activate -configure -access -on -users "$USUARIO" -privs -all -restart -agent >/dev/null 2>&1 \
  && echo "Compartir pantalla activado para $USUARIO (desde Windows: RealVNC Viewer a la IP de la Mac)." \
  || echo "No se pudo activar por terminal: Ajustes > General > Compartir > Compartir pantalla."
echo "IP actual de la Mac: $(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '?')"

paso "8. La extensión queda en $AQUI"
echo "Se carga descomprimida desde esta carpeta (git pull aquí = actualizarla y pulsar Recargar en chrome://extensions)."

cat <<'FIN'

== Lo que falta y solo se hace con la pantalla (o por Compartir pantalla / Chrome Remote Desktop) ==

 1. Ajustes > Usuarios y grupos > «Iniciar sesión automáticamente como» → este usuario
    (requiere FileVault APAGADO: Ajustes > Privacidad y seguridad > FileVault).
 2. Ajustes > Pantalla bloqueada > «Solicitar contraseña tras activarse el salvapantallas o apagarse la pantalla» → Nunca.
 3. Abrir Chrome → chrome://extensions → activar «Modo de desarrollador» → «Cargar descomprimida» → esta carpeta.
    Si ya había una versión vieja de ImporKiller, quitarla primero.
 4. Pestaña 1 (ventana propia): https://chatcenter.imporfactory.app → iniciar sesión con el super administrador del radar.
    La extensión toma la sesión y la cambia sola por una de 90 días que se renueva (icono → debe decir «sesión larga hasta …»).
 5. Pestaña 2 (OTRA ventana, al frente, única en su ventana): Biblioteca de anuncios de Meta
    https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EC&media_type=all
    → panel ImporKiller → Radar → Automático, países marcados → Iniciar. Cerrar sesión de Facebook NO hace falta
    (la Biblioteca es pública), pero si Meta pide verificación la resuelve una persona y pulsa Reanudar.
 6. Chrome Remote Desktop (para entrar desde fuera de la red): https://remotedesktop.google.com/access
    → «Configurar acceso remoto» → instalar → dar permisos de Accesibilidad y Grabación de pantalla cuando macOS los pida.
 7. Conectar el HDMI fantasma (dummy plug) y quitar el monitor. Sin él, macOS deja una pantalla virtual diminuta
    y Chrome se ve mal por control remoto.

 Comprobación diaria desde cualquier parte: en https://chatcenter.imporfactory.app/imporkiller la portada dice
 «radar hace X». Más de 12 h = algo se cayó: entrar por Chrome Remote Desktop y mirar el panel del radar.
FIN
