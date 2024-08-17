'use client';

import React, { useEffect, useRef } from 'react';
import Space from './space';
import { NextPage } from 'next';

const MAX_FPS = 60;

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const clicking = useRef(false);

  useEffect(() => {
    if (!canvas.current) return;
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    const timestepsPerFrame = 12;
    const totalCells = 120000;
    const aspectRatio = canvas.current.width / canvas.current.height;
    const numCellsX = Math.floor(Math.sqrt(totalCells * aspectRatio));
    const numCellsY = Math.floor(Math.sqrt(totalCells / aspectRatio));

    let ux = 0.05;
    let uy = 0;
    if (numCellsY >= numCellsX) {
      ux = 0;
      uy = 0.05;
    }

    space.current = new Space(
      gl,
      timestepsPerFrame,
      numCellsX,
      numCellsY,
      ux,
      uy
    );

    let lastTime = 0;

    function draw(time: number) {
      if (!gl) return;
      if (!space.current) return;

      const deltaTime = time - lastTime;
      if (deltaTime < 1000 / MAX_FPS) {
        requestAnimationFrame(draw);
        return;
      }

      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      space.current.step(mouseX.current, mouseY.current, clicking.current);
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
        className="block touch-none"
        width="640"
        height="480"
        onContextMenu={event => event.preventDefault()}
        tabIndex={0}
        onMouseDown={() => {
          clicking.current = true;
        }}
        onMouseMove={event => {
          if (!canvas.current) return;

          const rect = canvas.current.getBoundingClientRect();
          mouseX.current = event.clientX - rect.left;
          mouseY.current = event.clientY - rect.top;
        }}
        onMouseUp={() => {
          clicking.current = false;
        }}
        onTouchStart={event => {
          if (!canvas.current) return;

          const rect = canvas.current.getBoundingClientRect();
          mouseX.current = event.touches[0].clientX - rect.left;
          mouseY.current = event.touches[0].clientY - rect.top;

          clicking.current = true;
        }}
        onTouchMove={event => {
          if (!canvas.current) return;

          const rect = canvas.current.getBoundingClientRect();
          mouseX.current = event.touches[0].clientX - rect.left;
          mouseY.current = event.touches[0].clientY - rect.top;
        }}
        onTouchEnd={() => {
          clicking.current = false;
        }}
      />
    </div>
  );
};

export default Demo;
