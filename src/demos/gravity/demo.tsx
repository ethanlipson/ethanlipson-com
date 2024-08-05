import React, { useEffect, useRef, useState } from 'react';
import { mat4, vec3 } from 'gl-matrix';
import Space from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const MAX_FPS = 60;

const Demo: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMouseClickRef = useRef<[number, number]>([0, 0]);
  const frame = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    lastMouseClickRef.current = [canvas.width / 2, canvas.height / 2];
    const gl = canvas!.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    const space = new Space(gl, 200000);

    let lastTime = 0;

    function draw(time: number) {
      if (!gl) return;

      const deltaTime = time - lastTime;
      if (deltaTime < 1000 / MAX_FPS) {
        // requestAnimationFrame(draw);
        // return;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      space.step(1 / 60, lastMouseClickRef.current);
      space.render();

      lastTime = time;

      requestAnimationFrame(draw);

      frame.current++;
      if (
        canvasRef.current &&
        frame.current == 180 &&
        lastMouseClickRef.current[0] == canvasRef.current.width / 2 &&
        lastMouseClickRef.current[1] == canvasRef.current.height / 2
      ) {
        lastMouseClickRef.current = [
          (canvasRef.current.width * 3) / 5,
          (canvasRef.current.height * 3) / 5,
        ];
      }
    }

    requestAnimationFrame(draw);
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={e => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = rect.height - (e.clientY - rect.top);
          lastMouseClickRef.current = [x, y];
        }}
      />
    </div>
  );
};

export default Demo;
