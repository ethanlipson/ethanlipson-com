import { useEffect, useRef } from 'react';
import Space from '../metaballs-2d/space';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  let space: Space;

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (gl === null) {
      alert(
        'Unable to initialize WebGL. Your browser or machine may not support it.'
      );

      return;
    }

    const minDimension = Math.min(
      canvas.current!.width,
      canvas.current!.height
    );
    space = new Space(
      gl,
      canvas.current!.width,
      canvas.current!.height,
      Math.floor(minDimension / 40)
    );

    for (let i = 0; i < 10; i++) {
      const radius = Math.random() * (minDimension / 12) + minDimension / 24;
      space.addMetaball(
        Math.random() * (space.screenWidth - 2 * radius) + radius,
        Math.random() * (space.screenHeight - 2 * radius) + radius,
        (Math.random() >= 0.5 ? 1 : -1) *
          (Math.random() * (minDimension / 120) + minDimension / 1000),
        (Math.random() >= 0.5 ? 1 : -1) *
          (Math.random() * (minDimension / 120) + minDimension / 1000),
        radius
      );
    }

    function drawScene(time: number) {
      space.step();
      space.draw(gl!, Math.floor(minDimension / 40), time / 100);

      // console.log('Render');

      requestAnimationFrame(drawScene);
    }

    requestAnimationFrame(drawScene);
  });

  return (
    <div className={styles['metaballs-2d']}>
      <canvas
        ref={canvas}
        id="glCanvas"
        onMouseDown={event =>
          space.onClick(event.clientX, canvas.current!.height - event.clientY)
        }
        onMouseUp={() => space.onRelease()}
        onMouseMove={event =>
          space.onMove(event.clientX, canvas.current!.height - event.clientY)
        }
        onTouchStart={event => {
          space.onClick(
            event.touches.item(0).clientX,
            canvas.current!.height - event.touches.item(0).clientY
          );
        }}
        onTouchEnd={() => {
          space.onRelease();
        }}
        onTouchMove={event => {
          space.onMove(
            event.touches.item(0).clientX,
            canvas.current!.height - event.touches.item(0).clientY
          );
        }}
      />
    </div>
  );
};

export default Demo;
