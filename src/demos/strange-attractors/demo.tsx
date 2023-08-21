import React, { useEffect, useRef } from 'react';
import Camera, { Direction } from './camera';
import { mat4, vec3 } from 'gl-matrix';
import Space, { attractors } from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const INITIAL_CAMERA_POSITION = vec3.fromValues(0, 0, 10);
const INITIAL_CAMERA_PITCH = 0;
const INITIAL_CAMERA_YAW = -90;

const MAX_FPS = 60;
const NUM_PARTICLES = 4;

const TRAIL_LENGTH = 100;

const attractorSpeeds = {
  lorenz: 1,
  aizawa: 3,
  sakarya: 1,
};

const currentAttractor = 'lorenz';

const Demo: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const camera = useRef(
    new Camera(
      vec3.clone(INITIAL_CAMERA_POSITION),
      INITIAL_CAMERA_PITCH,
      INITIAL_CAMERA_YAW
    )
  );
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

    space.current = new Space(gl, attractors[currentAttractor], NUM_PARTICLES);

    let lastTime = 0;

    function draw(time: number) {
      if (!gl) return;
      if (!space.current) return;

      const deltaTime = time - lastTime;
      if (deltaTime < 1000 / MAX_FPS) {
        requestAnimationFrame(draw);
        return;
      }

      directions.current.forEach(direction => {
        camera.current.processKeyboard(
          direction,
          shiftPressed.current ? 3 : 1,
          deltaTime / 1000
        );
      });

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const projection = mat4.perspective(
        mat4.create(),
        (camera.current.fov * Math.PI) / 180,
        canvas.current!.width / canvas.current!.height,
        0.1,
        1000
      );
      const view = camera.current.getViewMatrix(mat4.create());
      const model = mat4.create();

      if (!paused.current) {
        const timestep = 1 / 60;
        const substeps = 20;

        space.current.step(
          timestep * attractorSpeeds[currentAttractor],
          substeps
        );
      }

      space.current.render(projection, view, model, TRAIL_LENGTH);

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
        onClick={() => canvas.current?.requestPointerLock()}
        onContextMenu={event => event.preventDefault()}
        onMouseMove={event => {
          if (!canvas.current) return;
          if (document.pointerLockElement !== canvas.current) return;

          camera.current.processMouseMovement(
            event.movementX,
            -event.movementY
          );
        }}
        onKeyDown={event => {
          if (!space.current) return;

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
          if (event.key.toLowerCase() === 'r') {
            camera.current.position = vec3.clone(INITIAL_CAMERA_POSITION);
            camera.current.pitch = INITIAL_CAMERA_PITCH;
            camera.current.yaw = INITIAL_CAMERA_YAW;
            camera.current.updateCameraVectors();
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
