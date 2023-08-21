import React, { useEffect, useRef, useState } from 'react';
import Space from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const space = useRef<Space | null>(null);

  const [clicked, setClicked] = useState(false);

  const simulationCellSize = 2;

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (gl === null) {
      alert('WebGL2 is not available');

      return;
    }

    space.current = new Space(
      gl!,
      canvas.current!.width,
      canvas.current!.height,
      Math.floor(canvas.current!.width / simulationCellSize),
      Math.floor(canvas.current!.height / simulationCellSize)
    );

    function drawScene(time: number) {
      space.current!.step(gl!);
      space.current!.step(gl!);
      space.current!.step(gl!);
      space.current!.draw(gl!);

      // console.log('Render');

      requestAnimationFrame(drawScene);
    }

    requestAnimationFrame(drawScene);
  }, []);

  return (
    <div className={styles['heat-simulation']}>
      <canvas
        ref={canvas}
        width="640"
        height="480"
        onMouseDown={() => setClicked(true)}
        onMouseUp={() => setClicked(false)}
        onMouseMove={event => {
          if (!canvas.current) return;
          if (!space.current) return;
          if (!clicked) return;

          const x = Math.floor(
            (event.clientX - canvas.current.getBoundingClientRect().left) /
              simulationCellSize
          );
          const y = Math.floor(
            (canvas.current.height -
              (event.clientY - canvas.current.getBoundingClientRect().top)) /
              simulationCellSize
          );
          const minDimension = Math.min(
            canvas.current.width / simulationCellSize,
            canvas.current.height / simulationCellSize
          );
          const r = Math.floor(minDimension / 12);

          space.current!.addHeat(x, y, r);
        }}
        onTouchMove={event => {
          if (!canvas.current) return;
          if (!space.current) return;

          for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches.item(i);

            const x = Math.floor(
              (touch.clientX - canvas.current.getBoundingClientRect().left) /
                simulationCellSize
            );
            const y = Math.floor(
              (canvas.current!.height -
                (touch.clientY - canvas.current.getBoundingClientRect().top)) /
                simulationCellSize
            );
            const minDimension = Math.min(
              canvas.current.width / simulationCellSize,
              canvas.current.height / simulationCellSize
            );
            const r = Math.floor(minDimension / 12);

            space.current.addHeat(x, y, r);
          }
        }}
      />
    </div>
  );
};

export default Demo;
