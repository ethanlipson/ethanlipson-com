import React, { useEffect, useRef } from 'react';
import Space from './space';
import styles from './demo.module.css';

const MAX_FPS = 60;

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const paused = useRef(false);
  const shouldReset = useRef(false);
  const shiftPressed = useRef(false);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const clicking = useRef(false);
  const rightClicking = useRef(false);

  useEffect(() => {
    if (!canvas.current) return;
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    const gl = canvas.current.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    space.current = new Space(
      gl,
      Math.floor(gl.canvas.width / Math.log10(gl.canvas.width)),
      Math.floor(gl.canvas.height / Math.log10(gl.canvas.width))
    );

    let lastTime = 0;

    function draw(time: number) {
      if (!canvas.current) return;
      if (!space.current) return;
      if (!gl) return;

      const deltaTime = time - lastTime;
      if (deltaTime < 1000 / MAX_FPS) {
        requestAnimationFrame(draw);
        return;
      }

      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (shouldReset.current) {
        space.current.reset();
        shouldReset.current = false;
      }

      if (!paused.current) {
        const timestep = 1 / 60;
        space.current.step(timestep, 45);
      }

      space.current.render();

      lastTime = time;

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }, []);

  return (
    <div>
      <canvas
        ref={canvas}
        className={styles.canvas}
        onContextMenu={event => event.preventDefault()}
        onMouseMove={event => {
          if (!canvas.current) return;

          const rect = canvas.current.getBoundingClientRect();
          mouseX.current = event.clientX - rect.left;
          mouseY.current = event.clientY - rect.top;
        }}
        onKeyDown={event => {
          if (!space.current) return;

          shiftPressed.current = event.shiftKey;

          if (event.key === ' ') {
            paused.current = !paused.current;
          }
          if (event.key.toLowerCase() === 'r') {
            shouldReset.current = true;
          }
        }}
        onKeyUp={event => {
          shiftPressed.current = false;
        }}
        onMouseDown={event => {
          if (event.button === 0) {
            clicking.current = true;
          } else if (event.button === 2) {
            rightClicking.current = true;
          }
        }}
        onMouseUp={event => {
          if (event.button === 0) {
            clicking.current = false;
          } else if (event.button === 2) {
            rightClicking.current = false;
          }
        }}
        tabIndex={0}
      />
    </div>
  );
};

export default Demo;
