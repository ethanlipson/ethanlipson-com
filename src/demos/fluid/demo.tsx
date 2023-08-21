import React, { useEffect, useRef, useState } from 'react';
import Camera, { Direction } from './camera';
import { mat4, vec3 } from 'gl-matrix';
import Space from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const camera = useRef(new Camera());
  const directions = useRef(new Set<Direction>());
  const shiftPressed = useRef(false);
  const paused = useRef(false);

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    gl.viewport(0, 0, canvas.current!.width, canvas.current!.height);
    gl.enable(gl.DEPTH_TEST);

    space.current = new Space(gl, 15000);

    let lastTime = 0;

    function draw(time: number) {
      if (!gl) return;
      if (!canvas.current) return;
      if (!space.current) return;

      const deltaTime = time - lastTime;

      directions.current.forEach(direction => {
        camera.current.processKeyboard(
          direction,
          shiftPressed.current ? 3 : 1,
          deltaTime / 1000
        );
      });

      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (!paused.current) {
        for (let i = 0; i < 75; i++) {
          space.current.addParticle(
            [Math.random() - 1, Math.random(), Math.random()],
            [10, 0, 0]
          );
        }
        space.current.step(gl, 0.0167);
      }

      const projection = mat4.perspective(
        mat4.create(),
        (camera.current.fov * Math.PI) / 180,
        canvas.current.width / canvas.current.height,
        0.1,
        100
      );
      const view = camera.current.getViewMatrix(mat4.create());
      const model = mat4.create();

      space.current.draw(
        gl,
        projection,
        view,
        model,
        vec3.fromValues(0, 10, 10),
        camera.current.position
      );

      lastTime = time;

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }, []);

  return (
    <div className={styles['fluid']}>
      <canvas
        ref={canvas}
        width="640"
        height="480"
        onClick={() => canvas.current?.requestPointerLock()}
        onMouseMove={event => {
          if (document.pointerLockElement === canvas.current) {
            camera.current.processMouseMovement(event.movementX, -event.movementY);
          }
        }}
        onKeyDown={event => {
          shiftPressed.current = event.shiftKey;

          if (event.key.toLowerCase() === 'w') {
            directions.current.add(Direction.FORWARD);
          }
          if (event.key.toLowerCase() === 's') {
            directions.current.add(Direction.BACKWARD);
          }
          if (event.key.toLowerCase() === 'a') {
            directions.current.add(Direction.LEFT);
          }
          if (event.key.toLowerCase() === 'd') {
            directions.current.add(Direction.RIGHT);
          }
          if (event.key.toLowerCase() === 'q') {
            directions.current.add(Direction.DOWN);
          }
          if (event.key.toLowerCase() === 'e') {
            directions.current.add(Direction.UP);
          }
          if (event.key === ' ') {
            paused.current = !paused.current;
          }
        }}
        onKeyUp={event => {
          shiftPressed.current = false;

          if (event.key.toLowerCase() === 'w') {
            directions.current.delete(Direction.FORWARD);
          }
          if (event.key.toLowerCase() === 's') {
            directions.current.delete(Direction.BACKWARD);
          }
          if (event.key.toLowerCase() === 'a') {
            directions.current.delete(Direction.LEFT);
          }
          if (event.key.toLowerCase() === 'd') {
            directions.current.delete(Direction.RIGHT);
          }
          if (event.key.toLowerCase() === 'q') {
            directions.current.delete(Direction.DOWN);
          }
          if (event.key.toLowerCase() === 'e') {
            directions.current.delete(Direction.UP);
          }
        }}
        tabIndex={0}
      />
    </div>
  );
};

export default Demo;
