import React, { useEffect, useRef } from 'react';

const DOT_SPACING = 28;
const DOT_RADIUS = 0.8;
const DOT_COLOR = [160, 170, 182]; // #a0aab6
const WAVE_INTERVAL = 12000; // ms between waves
const WAVE_DURATION = 5000; // ms for wave to cross screen
const WAVE_WIDTH = 200; // px width of the wave band
const WAVE_AMPLITUDE = 4; // px max displacement
const WAVE_DOT_SCALE = 1.8; // max dot size multiplier at wave peak

export const DotGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let waveStart = -1;
    let waveTimer: ReturnType<typeof setInterval>;

    const resize = () => {
      // Size to the <main> scrollable container (visible viewport)
      const main = canvas.closest('main');
      if (!main) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = main.clientWidth * dpr;
      canvas.height = main.clientHeight * dpr;
      canvas.style.width = `${main.clientWidth}px`;
      canvas.style.height = `${main.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / DOT_SPACING) + 1;
      const rows = Math.ceil(h / DOT_SPACING) + 1;

      // Wave progress: -1 means no wave
      let waveProgress = -1;
      if (waveStart > 0) {
        const elapsed = now - waveStart;
        if (elapsed < WAVE_DURATION + 1000) {
          // Wave front moves from left (-WAVE_WIDTH) to right (w + WAVE_WIDTH)
          const totalTravel = w + WAVE_WIDTH * 2;
          waveProgress = -WAVE_WIDTH + (elapsed / WAVE_DURATION) * totalTravel;
        } else {
          waveStart = -1;
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let x = col * DOT_SPACING;
          let y = row * DOT_SPACING;
          let radius = DOT_RADIUS;
          let alpha = 0.6;

          if (waveProgress >= 0) {
            const dist = Math.abs(x - waveProgress);
            if (dist < WAVE_WIDTH) {
              const t = 1 - dist / WAVE_WIDTH;
              const ease = Math.sin(t * Math.PI);
              y += Math.sin(x * 0.03 + row * 0.5) * WAVE_AMPLITUDE * ease;
              radius = DOT_RADIUS * (1 + (WAVE_DOT_SCALE - 1) * ease);
              alpha = 0.6 + 0.4 * ease;
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${DOT_COLOR[0]}, ${DOT_COLOR[1]}, ${DOT_COLOR[2]}, ${alpha})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const triggerWave = () => {
      waveStart = performance.now();
    };

    resize();
    animId = requestAnimationFrame(draw);

    // First wave after a short delay, then every WAVE_INTERVAL
    const initialTimer = setTimeout(() => {
      triggerWave();
      waveTimer = setInterval(triggerWave, WAVE_INTERVAL);
    }, 3000);

    const resizeObserver = new ResizeObserver(resize);
    const main = canvas.closest('main');
    if (main) resizeObserver.observe(main);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(initialTimer);
      clearInterval(waveTimer);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="sticky top-0 w-full h-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />
    </div>
  );
};
