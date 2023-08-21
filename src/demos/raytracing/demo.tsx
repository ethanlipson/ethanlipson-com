import { vec3 } from 'gl-matrix';
import { NextPage } from 'next';
import { useEffect, useRef } from 'react';
import Camera, { Direction } from './camera';
import Raytracer, { Material } from './raytracer';
import styles from './demo.module.css';

const Demo: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const camera = useRef(new Camera([0, 0, 1]));
  const directions = useRef(new Set<Direction>());
  const shiftPressed = useRef(false);

  useEffect(() => {
    if (!canvas.current) return;
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;

    const gl = canvas.current.getContext('webgl2', {
      preserveDrawingBuffer: true,
      alpha: false,
    });
    if (!gl) return;

    const raytracer = new Raytracer(gl);
    const red = raytracer.createMetallic([0.7, 0.3, 0.3], 0);
    const grass = raytracer.createLambertian([0.8, 0.8, 0]);
    const blue = raytracer.createLambertian([0.1, 0.2, 0.5]);
    const glass = raytracer.createDielectric([0.9, 0.9, 0.9], 1.5);
    const metal = raytracer.createMetallic([0.8, 0.6, 0.2], 0);
    raytracer.addSphere([0, -100.5, -1], 100, grass);
    raytracer.addSphere([0, 0.05, -1], 0.5, blue);
    // raytracer.addSphere([0, 0.1, -1], 0.5, [1.5, 0, 0], Material.dielectric);
    // raytracer.addSphere([-1.1, 0, -1], 0.5, [0.8, 0.8, 0.8], Material.metal);
    raytracer.addSphere([-1.1, 0.05, -1], 0.5, glass);
    // raytracer.addSphere([-1.1, 0.05, -1], -0.45, [1.5, 0, 0], Material.dielectric);
    raytracer.addSphere([1.1, 0.05, -1], 0.5, metal);
    // raytracer.addTorus([0, 0.5, -1], 3.5, -0.9, glass);

    // raytracer.addSphere([0, -1000, 0], 1000, [0.5, 0.5, 0.5], Material.lambertian);

    // for (let a = -11; a < 11; a++) {
    //   for (let b = -11; b < 11; b++) {
    //     let matChoice = Math.random();
    //     let center = vec3.fromValues(
    //       a + 0.9 * Math.random(),
    //       0.2,
    //       b + 0.9 * Math.random()
    //     );

    //     if (
    //       vec3.length(vec3.sub(vec3.create(), center, vec3.fromValues(4, 0.2, 0))) > 0.9
    //     ) {
    //       if (matChoice < 0.8) {
    //         let color = vec3.fromValues(Math.random(), Math.random(), Math.random());
    //         raytracer.addSphere(center, 0.2, color, Material.lambertian);
    //       } else if (matChoice < 0.95) {
    //         let albedo = Math.random() * 0.5 + 0.5;
    //         raytracer.addSphere(center, 0.2, [albedo, albedo, albedo], Material.metal);
    //       } else {
    //         raytracer.addSphere(center, 0.2, [1.5, 0, 0], Material.dielectric);
    //       }
    //     }
    //   }
    // }

    // raytracer.addSphere([0, 1, 0], 1, [1.5, 0, 0], Material.dielectric);
    // raytracer.addSphere([-4, 1, 0], 1, [0.4, 0.2, 0.1], Material.lambertian);
    // raytracer.addSphere([4, 1, 0], 1, [0.7, 0.6, 0.5], Material.metal);

    let lastTime = 0;

    function render(time: number) {
      if (!gl) return;

      const deltaTime = time - lastTime;

      directions.current.forEach(direction => {
        camera.current.processKeyboard(
          direction,
          shiftPressed.current ? 3 : 1,
          deltaTime / 1000
        );
      });

      raytracer.render(
        camera.current.position,
        camera.current.front,
        camera.current.fov
      );

      lastTime = time;

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }, []);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvas}
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
