import React, { useEffect, useRef, useState } from 'react';
import Camera, { Direction } from './camera';
import { mat4, vec3 } from 'gl-matrix';
import Space from './space';
import styles from './demo.module.css';
import SliderOption from './SliderOption';

const NUM_PARTICLES = 100000;

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const camera = useRef(new Camera());
  const directions = useRef(new Set<Direction>());
  const shiftPressed = useRef(false);
  const paused = useRef(false);
  const clicking = useRef(false);
  const prevTouchPosition = useRef({ x: 0, y: 0 });

  const [viewAngle, setViewAngle] = useState(240);
  const [alignmentCoefficient, setAlignmentCoefficient] = useState(1.0);
  const [cohesionCoefficient, setCohesionCoefficient] = useState(0.3);
  const [separationCoefficient, setSeparationCoefficient] = useState(1.0);
  const [targetSeparation, setTargetSeparation] = useState(0.4);
  const [maxSpeed, setMaxSpeed] = useState(2.0);

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }

    gl.viewport(0, 0, canvas.current!.width, canvas.current!.height);
    gl.enable(gl.DEPTH_TEST);

    space.current = new Space(
      gl,
      NUM_PARTICLES,
      alignmentCoefficient,
      cohesionCoefficient,
      separationCoefficient,
      targetSeparation,
      maxSpeed,
      viewAngle
    );
    const intialSpeed = maxSpeed;
    const size = 20;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      space.current.addParticle(
        [
          2 * size * Math.random() - size,
          2 * size * Math.random() - size,
          2 * size * Math.random() - size,
        ],
        // [Math.random(), Math.random(), Math.random()],
        // [0, 0, 0],
        [
          intialSpeed * Math.random() - intialSpeed / 2,
          intialSpeed * Math.random() - intialSpeed / 2,
          intialSpeed * Math.random() - intialSpeed / 2,
        ]
      );
    }

    let lastTime = 0;

    function draw(time: number) {
      if (!gl) return;
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
        space.current.step(gl, 0.0167);
      }

      const projection = mat4.perspective(
        mat4.create(),
        (camera.current.fov * Math.PI) / 180,
        canvas.current!.width / canvas.current!.height,
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
        vec3.fromValues(0, 10, 10)
      );

      lastTime = time;

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (!space.current) return;

    space.current.alignmentCoefficient = alignmentCoefficient;
    space.current.cohesionCoefficient = cohesionCoefficient;
    space.current.separationCoefficient = separationCoefficient;
    space.current.targetSeparation = targetSeparation;
    space.current.maxSpeed = maxSpeed;
    space.current.viewAngle = viewAngle;
  }, [
    alignmentCoefficient,
    cohesionCoefficient,
    separationCoefficient,
    targetSeparation,
    maxSpeed,
    viewAngle,
  ]);

  return (
    <canvas
      ref={canvas}
      className={styles.canvas}
      width="640"
      height="480"
      onMouseDown={() => {
        clicking.current = true;
      }}
      onMouseMove={event => {
        if (!clicking.current) return;

        camera.current.processMouseMovement(-event.movementX, event.movementY);
      }}
      onMouseUp={() => {
        clicking.current = false;
      }}
      onTouchStart={event => {
        clicking.current = true;

        const touch = event.touches[0];
        prevTouchPosition.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchMove={event => {
        if (!clicking.current) return;

        const touch = event.touches[0];
        const movementX = touch.clientX - prevTouchPosition.current.x;
        const movementY = touch.clientY - prevTouchPosition.current.y;
        prevTouchPosition.current = { x: touch.clientX, y: touch.clientY };

        camera.current.processMouseMovement(-movementX, movementY);
      }}
      onTouchEnd={() => {
        clicking.current = false;
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
  );
};

export default Demo;
