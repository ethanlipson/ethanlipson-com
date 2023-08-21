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

      space.current.draw(gl, projection, view, model, vec3.fromValues(0, 10, 10));

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
    <div>
      <div className={styles.options}>
        <SliderOption
          name="View Angle"
          id="viewAngle"
          value={viewAngle}
          onChange={setViewAngle}
          min={0}
          max={360}
          step={10}
        />
        <SliderOption
          name="Cohesion Coefficient"
          id="cohesion"
          value={cohesionCoefficient}
          onChange={setCohesionCoefficient}
          min={0}
          max={1}
          step={0.05}
        />
        <SliderOption
          name="Separation Coefficient"
          id="separation"
          value={separationCoefficient}
          onChange={setSeparationCoefficient}
          min={0}
          max={5}
          step={0.1}
        />
        <SliderOption
          name="Alignment Coefficient"
          id="alignment"
          value={alignmentCoefficient}
          onChange={setAlignmentCoefficient}
          min={0}
          max={5}
          step={0.1}
        />
        <SliderOption
          name="Target Separation"
          id="targetSeparation"
          value={targetSeparation}
          onChange={setTargetSeparation}
          min={0}
          max={1}
          step={0.05}
        />
        <SliderOption
          name="Max Speed"
          id="maxSpeed"
          value={maxSpeed}
          onChange={setMaxSpeed}
          min={0}
          max={10}
          step={0.1}
        />
      </div>
      <canvas
        ref={canvas}
        className={styles.canvas}
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
