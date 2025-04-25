import { memo, useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

/**
 * Fondo animado con partículas.
 * Memoizado para que NO se reinicie en cada re-render del padre.
 */
function AnimatedBackgroundComponent() {
  // Cargamos las features de tsparticles una sola vez
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  // Opciones constantes; se crean solo al primer render
  const options = useMemo(
    () => ({
      fullScreen: { enable: true, zIndex: 0 },
      particles: {
        number: { value: 90, density: { enable: true, area: 800 } },
        color: { value: "#ffffff" },
        shape: { type: "triangle" },
        opacity: { value: 0.5 },
        size: {
          value: { min: 3.5, max: 5 },
          animation: { enable: true, speed: 5, sync: false },
        },
        move: {
          enable: true,
          speed: 2,
          direction: "none",
          outModes: { default: "out" },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "repulse" },
          onClick: { enable: true, mode: "push" },
        },
        modes: {
          repulse: { distance: 100, duration: 0.4 },
          push: { quantity: 4 },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return <Particles id="tsparticles" init={particlesInit} options={options} />;
}

/**
 * React.memo evita renders extra si no hay props nuevas,
 * por lo que el canvas de partículas se monta una única vez en el login.
 */
export default memo(AnimatedBackgroundComponent);
