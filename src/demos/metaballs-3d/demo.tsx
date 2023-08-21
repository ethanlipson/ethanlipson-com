import React, { useEffect, useRef } from "react";
import Camera, { Direction } from "./camera";
import { NextPage } from "next";
import { mat4 } from "gl-matrix";
import styles from "./demo.module.css";
import Space from "./space";

const MAX_FPS = 60;

// https://stackoverflow.com/a/17243070
function HSVtoRGB(h: number, s: number, v: number) {
  let r: number;
  let g: number;
  let b: number;
  let i: number;
  let f: number;
  let p: number;
  let q: number;
  let t: number;

  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return {
    r: r!,
    g: g!,
    b: b!,
  };
}

const Metaballs3D: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const space = useRef<Space | null>(null);
  const camera = useRef(new Camera());
  const directions = useRef(new Set<Direction>());
  const shiftPressed = useRef(false);
  const paused = useRef(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const gl = canvas.current!.getContext("webgl2");

    if (gl === null) {
      throw new Error("WebGL 2 not supported");
    }

    gl.viewport(0, 0, canvas.current!.width, canvas.current!.height);
    gl.enable(gl.DEPTH_TEST);

    const dim = isMobile ? 40 : 80;
    space.current = new Space(gl, dim);
    for (let i = 0; i < 10; i++) {
      const radius = dim * (Math.random() * 0.035 + 0.025);
      const x = Math.random() * (dim - radius * 2) + radius;
      const y = Math.random() * (dim - radius * 2) + radius;
      const z = Math.random() * (dim - radius * 2) + radius;
      const xvel =
        dim * (Math.random() >= 0.5 ? 1 : -1) * (Math.random() * 0.004 + 0.001);
      const yvel =
        dim * (Math.random() >= 0.5 ? 1 : -1) * (Math.random() * 0.004 + 0.001);
      const zvel =
        dim * (Math.random() >= 0.5 ? 1 : -1) * (Math.random() * 0.004 + 0.001);
      const { r, g, b } = HSVtoRGB(Math.random(), 1, 1);
      space.current.addMetaball(x, y, z, xvel, yvel, zvel, radius, r, g, b);
    }

    let lastTime = 0;

    function draw(time: number) {
      if (time - lastTime < 1000 / MAX_FPS) {
        requestAnimationFrame(draw);
        return;
      }

      if (gl === null) {
        return;
      }

      if (!camera.current || !space.current || !canvas.current) {
        return;
      }

      const deltaTime = time - lastTime;

      directions.current.forEach((direction) => {
        camera.current.processKeyboard(
          direction,
          shiftPressed.current ? 3 : 1,
          deltaTime / 1000
        );
      });

      const backgroundColor = HSVtoRGB(
        time / 20000 + space.current.metaballs.length! / 2 / 50,
        1,
        0.15
      );
      gl.clearColor(
        backgroundColor.r,
        backgroundColor.g,
        backgroundColor.b,
        1.0
      );
      gl.clear(gl.COLOR_BUFFER_BIT);

      space.current?.metaballs.forEach((metaball, i) => {
        const { r, g, b } = HSVtoRGB(
          time / 20000 + i / 50,
          1,
          0.75 + (i / (space.current!.metaballs.length! - 1)) * 0.25
        );
        metaball.r = r;
        metaball.g = g;
        metaball.b = b;
      });

      if (!paused.current) {
        space.current!.step(gl);
      }

      const projection = mat4.perspective(
        mat4.create(),
        (camera.current.fov * Math.PI) / 180,
        canvas.current.width / canvas.current!.height,
        0.1,
        100
      );
      const view = camera.current.getViewMatrix(mat4.create());
      const model = mat4.translate(mat4.create(), mat4.create(), [-5, -5, -12]);
      mat4.scale(model, model, [10 / dim, 10 / dim, 10 / dim]);

      space.current.draw(gl, projection, view, model, camera.current.position);

      lastTime = time;

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }, []);

  return (
    <div className={styles["metaballs-3d"]}>
      <canvas
        ref={canvas}
        width="640"
        height="480"
        onClick={() => canvas.current?.requestPointerLock()}
        onMouseMove={(event) => {
          if (document.pointerLockElement === canvas.current) {
            camera.current.processMouseMovement(
              event.movementX,
              -event.movementY
            );
          }
        }}
        onKeyDown={(event) => {
          shiftPressed.current = event.shiftKey;

          if (event.key.toLowerCase() === "w") {
            directions.current.add(Direction.FORWARD);
          }
          if (event.key.toLowerCase() === "s") {
            directions.current.add(Direction.BACKWARD);
          }
          if (event.key.toLowerCase() === "a") {
            directions.current.add(Direction.LEFT);
          }
          if (event.key.toLowerCase() === "d") {
            directions.current.add(Direction.RIGHT);
          }
          if (event.key.toLowerCase() === "q") {
            directions.current.add(Direction.DOWN);
          }
          if (event.key.toLowerCase() === "e") {
            directions.current.add(Direction.UP);
          }
          if (event.key === " ") {
            paused.current = !paused.current;
          }
        }}
        onKeyUp={(event) => {
          shiftPressed.current = false;

          if (event.key.toLowerCase() === "w") {
            directions.current.delete(Direction.FORWARD);
          }
          if (event.key.toLowerCase() === "s") {
            directions.current.delete(Direction.BACKWARD);
          }
          if (event.key.toLowerCase() === "a") {
            directions.current.delete(Direction.LEFT);
          }
          if (event.key.toLowerCase() === "d") {
            directions.current.delete(Direction.RIGHT);
          }
          if (event.key.toLowerCase() === "q") {
            directions.current.delete(Direction.DOWN);
          }
          if (event.key.toLowerCase() === "e") {
            directions.current.delete(Direction.UP);
          }
        }}
        tabIndex={0}
      />
    </div>
  );
};

export default Metaballs3D;
