import { memo, useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

/**
 * Fondo animado con partículas azules y background blanco.
 * Memoizado para que no se reinicie en cada re-render.
 */
function AnimatedBackgroundComponent() {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: true, zIndex: 0 },
      background: { color: "#ffffff" }, // fondo blanco
      fpsLimit: 60,
      particles: {
        number: { value: 80, density: { enable: true, area: 800 } },
        color: { value: "#3b82f6" }, // azul (tailwind blue-600)
        shape: { type: "circle" },   // bolitas
        opacity: { value: 0.35 },
        size: {
          value: { min: 2, max: 4 },
          animation: { enable: true, speed: 3, sync: false },
        },
        links: { enable: false }, // sin líneas
        move: {
          enable: true,
          speed: 1.2,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "out" },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "repulse" },
          onClick: { enable: true, mode: "push" },
          resize: true,
        },
        modes: {
          repulse: { distance: 100, duration: 0.4 },
          push: { quantity: 3 },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return <Particles id="tsparticles" init={particlesInit} options={options} />;
}

export default memo(AnimatedBackgroundComponent);
