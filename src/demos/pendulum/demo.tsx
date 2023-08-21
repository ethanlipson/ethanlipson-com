import React, { useEffect, useRef } from 'react';
import vec2 from './vecs/vec2';
import Space from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    const ctx = canvas.current!.getContext('2d');

    if (!ctx) {
      console.log('Unable to get context');
      return;
    }

    const space = new Space();

    const numLinks = 5;
    const linkLength = 50;

    space.addMass(
      new vec2(canvas.current.width / 2, canvas.current.height - 100),
      new vec2(0),
      Infinity,
      false
    );

    for (let i = 0; i < numLinks; i++) {
      space.addMass(
        new vec2(
          canvas.current.width / 2 + (i + 1) * linkLength,
          canvas.current.height - 100
        ),
        new vec2(0),
        1,
        true
      );
    }

    for (let i = 0; i < numLinks; i++) {
      space.addConstraint(i, i + 1, linkLength);
    }

    function render(time: number) {
      if (!ctx) {
        return;
      }

      ctx.beginPath();
      ctx.fillStyle = '#ddd';
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fill();
      space.step(0.01);
      space.draw(ctx);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  });

  return (
    <div className={styles['pendulum']}>
      <canvas ref={canvas} width="640" height="480" />
    </div>
  );
};

export default Demo;
