import type { NextPage } from 'next';
import { useEffect, useRef, useState } from 'react';
import Visualizer from './visualizer';
import styles from './demo.module.css';
import { isMobile } from 'react-device-detect';

const Demo: NextPage = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const visualizer = useRef<Visualizer>();
  const [bottomLeft, setBottomLeft] = useState<[number, number]>([-2, -2]);
  const [topRight, setTopRight] = useState<[number, number]>([2, 2]);
  const [maxIterations, setMaxIterations] = useState(1000);
  const [escapeRadius, setEscapeRadius] = useState(2);
  const [leftMousePressed, setLeftMousePressed] = useState(false);
  const [rightMousePressed, setRightMousePressed] = useState(false);
  const [c, setC] = useState<[number, number]>([
    0.2898721827064974, -0.012637522602489737,
  ]);
  const [touches, setTouches] = useState<[[number, number], [number, number]]>([
    [0, 0],
    [0, 0],
  ]);
  const [initialSingleTouchPosition, setInitialSingleTouchPosition] = useState<
    [number, number]
  >([0, 0]);
  const [touchesWentToZero, setTouchesWentToZero] = useState(true);

  const screenToComplex = (x: number, y: number): [number, number] => {
    if (!canvas.current) return [0, 0];

    const rect = canvas.current.getBoundingClientRect();
    const mouseX = x - rect.x;
    const mouseY = rect.height - (y - rect.y);

    const normalizedX = mouseX / rect.width;
    const normalizedY = mouseY / rect.height;

    return [
      normalizedX * (topRight[0] - bottomLeft[0]) + bottomLeft[0],
      normalizedY * (topRight[1] - bottomLeft[1]) + bottomLeft[1],
    ];
  };

  const distance = (a: [number, number], b: [number, number]) => {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  };

  useEffect(() => {
    // FOR DEBUGGING
    // fetch('/api/hello', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'text/plain' },
    //   body: JSON.stringify([
    //     // event.touches.item(0).clientX,
    //     // event.touches.item(0).clientY,
    //     // event.touches.item(1).clientX,
    //     // event.touches.item(1).clientY,
    //     '-----',
    //   ]),
    // });

    if (!canvas.current) return;

    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    const gl = canvas.current.getContext('webgl2');
    if (!gl) return;

    if (canvas.current.width > canvas.current.height) {
      bottomLeft[0] = (-2 * canvas.current.width) / canvas.current.height;
      topRight[0] = (2 * canvas.current.width) / canvas.current.height;
    } else {
      bottomLeft[1] = (-2 * canvas.current.height) / canvas.current.width;
      topRight[1] = (2 * canvas.current.height) / canvas.current.width;
    }

    visualizer.current = new Visualizer(gl);
    visualizer.current.c = c;

    gl.viewport(0, 0, canvas.current.width, canvas.current.height);

    function draw(time: number) {
      if (!visualizer.current) return;
      if (!gl) return;

      visualizer.current.compute();

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (!visualizer.current) return;

    visualizer.current.bottomLeft = bottomLeft;
    visualizer.current.topRight = topRight;
    visualizer.current.maxIterations = maxIterations;
    visualizer.current.escapeRadius = escapeRadius;
    if (
      leftMousePressed &&
      topRight[0] - bottomLeft[0] >= 0.2 &&
      topRight[1] - bottomLeft[1] >= 0.2
    )
      visualizer.current.c = c;
  }, [bottomLeft, topRight, maxIterations, escapeRadius, c]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvas}
        onMouseDown={event => {
          if (event.button == 0) setLeftMousePressed(true);
          else if (event.button == 2) {
            setRightMousePressed(true);
          }
        }}
        onMouseMove={event => {
          if (!canvas.current) return;
          if (!visualizer.current) return;

          const newC = screenToComplex(event.clientX, event.clientY);

          if (rightMousePressed) {
            setBottomLeft([
              bottomLeft[0] - (newC[0] - c[0]),
              bottomLeft[1] - (newC[1] - c[1]),
            ]);
            setTopRight([
              topRight[0] - (newC[0] - c[0]),
              topRight[1] - (newC[1] - c[1]),
            ]);
          } else {
            setC(newC);
          }
        }}
        onMouseUp={event => {
          if (event.button == 0) setLeftMousePressed(false);
          else if (event.button == 2) {
            setRightMousePressed(false);
          }
        }}
        onWheel={event => {
          if (!visualizer.current) return;

          let scaleFactor;
          if (event.deltaY < 0) {
            scaleFactor = 0.9;
          } else {
            scaleFactor = 1 / 0.9;
          }

          setBottomLeft([
            scaleFactor * (bottomLeft[0] - c[0]) + c[0],
            scaleFactor * (bottomLeft[1] - c[1]) + c[1],
          ]);
          setTopRight([
            scaleFactor * (topRight[0] - c[0]) + c[0],
            scaleFactor * (topRight[1] - c[1]) + c[1],
          ]);
        }}
        onContextMenu={event => event.preventDefault()}
        onTouchStart={event => {
          if (event.touches.length === 1) {
            const touch = event.touches.item(0);
            setInitialSingleTouchPosition([touch.clientX, touch.clientY]);
          }
          if (event.touches.length === 2) {
            setTouchesWentToZero(false);
            const newTouches = [];
            for (let i = 0; i < 2; i++) {
              const touch = event.touches.item(i);
              newTouches.push([touch.clientX, touch.clientY]);
            }

            setTouches(newTouches as typeof touches);
          }
        }}
        onTouchMove={event => {
          if (!canvas.current) return;

          if (event.touches.length === 1) {
            const touch = event.touches.item(0);

            if (!touchesWentToZero) return;

            if (
              topRight[0] - bottomLeft[0] < 0.2 ||
              topRight[1] - bottomLeft[1] < 0.2
            )
              return;

            const distanceTraveled = distance(
              [touch.clientX, touch.clientY],
              initialSingleTouchPosition
            );
            if (distanceTraveled < 10) return;

            setInitialSingleTouchPosition([-100, -100]);

            const newC = screenToComplex(
              touch.clientX,
              touch.clientY - (isMobile ? canvas.current?.height / 4 : 0)
            );
            setC(newC);
            setLeftMousePressed(true);
          } else if (event.touches.length === 2) {
            const newTouches: any = [];
            for (let i = 0; i < 2; i++) {
              const touch = event.touches.item(i);
              newTouches.push([touch.clientX, touch.clientY]);
            }

            const scaleFactor = Math.pow(
              distance(touches[0], touches[1]) /
                distance(newTouches[0], newTouches[1]),
              1
            );
            const oldCenter = screenToComplex(
              touches[0][0] * 0.5 + touches[1][0] * 0.5,
              touches[0][1] * 0.5 + touches[1][1] * 0.5
            );
            const zoomCenter = screenToComplex(
              newTouches[0][0] * 0.5 + newTouches[1][0] * 0.5,
              newTouches[0][1] * 0.5 + newTouches[1][1] * 0.5
            );
            const centerOffset = [
              zoomCenter[0] - oldCenter[0],
              zoomCenter[1] - oldCenter[1],
            ];

            setBottomLeft([
              scaleFactor * (bottomLeft[0] - zoomCenter[0]) +
                zoomCenter[0] -
                centerOffset[0],
              scaleFactor * (bottomLeft[1] - zoomCenter[1]) +
                zoomCenter[1] -
                centerOffset[1],
            ]);
            setTopRight([
              scaleFactor * (topRight[0] - zoomCenter[0]) +
                zoomCenter[0] -
                centerOffset[0],
              scaleFactor * (topRight[1] - zoomCenter[1]) +
                zoomCenter[1] -
                centerOffset[1],
            ]);

            setTouches(newTouches as typeof touches);
          }
        }}
        onTouchEnd={event => {
          if (event.touches.length === 0) {
            setTouchesWentToZero(true);
          }
        }}
      />
    </div>
  );
};

export default Demo;
