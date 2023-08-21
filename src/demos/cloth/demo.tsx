import React, { useEffect, useRef } from 'react';
import Camera, { Direction } from './camera';
import { mat4, vec3 } from 'gl-matrix';
import Space from './space';
import { NextPage } from 'next';
import styles from './demo.module.css';

const INITIAL_CAMERA_POSITION = vec3.fromValues(0, 6.75, 16.5);
const INITIAL_CAMERA_PITCH = -20;
const INITIAL_CAMERA_YAW = -90;

const MAX_FPS = 60;

const Demo: React.FC = () => {
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
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const clicking = useRef(false);
  const rightClicking = useRef(false);
  const shouldResetCloth = useRef(false);

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    gl.viewport(0, 0, canvas.current!.width, canvas.current!.height);
    gl.enable(gl.DEPTH_TEST);

    space.current = new Space(gl, 10, 10, 200, 200, 1024);
    space.current.addSphere([0, 0, 0], 2);
    space.current.addSphere([0, 3, 0], 2);

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

      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const projection = mat4.perspective(
        mat4.create(),
        (camera.current.fov * Math.PI) / 180,
        canvas.current!.width / canvas.current!.height,
        0.1,
        100
      );
      const view = camera.current.getViewMatrix(mat4.create());
      const model = mat4.create();

      if (shouldResetCloth.current) {
        space.current.resetCloth();
        shouldResetCloth.current = false;
      }
      space.current.step(
        1 / 30,
        30,
        mouseX.current,
        mouseY.current,
        projection,
        view,
        model,
        clicking.current
      );
      if (!paused.current) {
        // const timestep = Math.min(deltaTime / 1000, 1 / 30);
        const timestep = 1 / 30;
      }

      space.current.render(projection, view, model, [-1, -1, -1]);

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
        width="640"
        height="480"
        onContextMenu={event => event.preventDefault()}
        onMouseMove={event => {
          if (!canvas.current) return;

          const rect = canvas.current.getBoundingClientRect();
          mouseX.current = event.clientX - rect.left;
          mouseY.current = event.clientY - rect.top;

          if (rightClicking.current) {
            camera.current.processMouseMovement(
              event.movementX,
              -event.movementY
            );
          }
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
            shouldResetCloth.current = true;
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
        onWheel={event => {
          if (!space.current) return;

          if (event.deltaY < 0) {
            space.current.grabbedParticleDistanceFromCamera = Math.min(
              space.current.grabbedParticleDistanceFromCamera + 0.5,
              30
            );
          } else {
            space.current.grabbedParticleDistanceFromCamera = Math.max(
              space.current.grabbedParticleDistanceFromCamera - 0.5,
              1
            );
          }
        }}
        tabIndex={0}
      />
    </div>
  );
};

export default Demo;
