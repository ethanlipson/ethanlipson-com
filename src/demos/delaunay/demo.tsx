import React, { useEffect, useRef, useState } from 'react';
import triangulate, { Point } from './triangulate';
import { NextPage } from 'next';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<(Point | null)[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number>(-1);
  const [dragged, setDragged] = useState<boolean>(false);
  const [nullEntries, setNullEntries] = useState<number[]>([]);

  useEffect(() => {
    const newPoints: (Point | null)[] = [];
    const numPoints = Math.floor((window.innerWidth * window.innerHeight) / 15000);
    for (let i = 0; i < numPoints; i++) {
      newPoints.push(
        new Point(Math.random() * window.innerWidth, Math.random() * window.innerHeight)
      );
    }

    newPoints.push(new Point(10, 10));
    newPoints.push(new Point(window.innerWidth - 10, 10));
    newPoints.push(new Point(10, window.innerHeight - 10));
    newPoints.push(new Point(window.innerWidth - 10, window.innerHeight - 10));

    setPoints(newPoints);
  }, []);

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;
    const ctx = canvas.current?.getContext('2d');

    if (!ctx) {
      console.log('Unable to get context');
      return;
    }

    const triangles = triangulate(points);
    triangles.forEach(triangle => {
      ctx.beginPath();
      ctx.moveTo(points[triangle.a]!.x, points[triangle.a]!.y);
      ctx.lineTo(points[triangle.b]!.x, points[triangle.b]!.y);
      ctx.lineTo(points[triangle.c]!.x, points[triangle.c]!.y);
      ctx.lineTo(points[triangle.a]!.x, points[triangle.a]!.y);

      const hash1 = 65179 * triangle.a + 80051 * triangle.b + 19531 * triangle.c;
      const hash2 = 15187 * triangle.a + 87587 * triangle.b + 23459 * triangle.c;
      const hash3 = 57751 * triangle.a + 79279 * triangle.b + 83023 * triangle.c;
      ctx.fillStyle = `hsl(
        ${hash1 % 360},
        ${60 + (hash2 % 20)}%,
        ${40 + (hash3 % 20)}%)
      `;

      ctx.fill();
    });

    points.forEach(point => {
      if (!point) {
        return;
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#000';
      ctx.fill();
    });
  }, [points]);

  return (
    <div className={styles['delaunay']}>
      <canvas
        ref={canvas}
        width="640"
        height="480"
        onMouseDown={event => {
          if (!canvas.current) {
            return;
          }

          const x = event.clientX - canvas.current.getBoundingClientRect().left;
          const y = event.clientY - canvas.current.getBoundingClientRect().top;

          let clickedPoint = false;
          for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (!point) {
              continue;
            }

            if (Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) < 400) {
              setDraggingIndex(i);
              clickedPoint = true;
              break;
            }
          }

          if (!clickedPoint) {
            if (nullEntries.length > 0) {
              points[nullEntries.pop()!] = new Point(x, y);
              setNullEntries([...nullEntries]);
              setPoints([...points]);
            } else {
              setPoints([...points, new Point(x, y)]);
            }
          }

          canvas.current.style.cursor = 'pointer';
        }}
        onMouseMove={event => {
          if (!canvas.current) {
            return;
          }

          const x = event.clientX - canvas.current.getBoundingClientRect().left;
          const y = event.clientY - canvas.current.getBoundingClientRect().top;

          if (draggingIndex !== -1) {
            points[draggingIndex]!.x = x;
            points[draggingIndex]!.y = y;
            setPoints([...points]);
            setDragged(true);
            return;
          }

          let hovering = points.some(point => {
            if (!point) {
              return false;
            }

            return (
              Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2) < Math.pow(20, 2)
            );
          });

          if (hovering) {
            canvas.current.style.cursor = 'pointer';
          } else {
            canvas.current.style.cursor = 'default';
          }
        }}
        onMouseUp={() => {
          if (!canvas.current) {
            return;
          }

          if (!dragged && draggingIndex !== -1) {
            points[draggingIndex] = null;
            setNullEntries([...nullEntries, draggingIndex]);
            setPoints([...points]);
            canvas.current.style.cursor = 'default';
          }

          setDraggingIndex(-1);
          setDragged(false);
        }}
        onTouchStart={event => {
          if (!canvas.current) {
            return;
          }

          const x =
            event.touches.item(0).clientX - canvas.current.getBoundingClientRect().left;
          const y =
            event.touches.item(0).clientY - canvas.current.getBoundingClientRect().top;

          let clickedPoint = false;
          for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (!point) {
              continue;
            }

            if (Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) < 400) {
              setDraggingIndex(i);
              clickedPoint = true;
              break;
            }
          }

          if (!clickedPoint) {
            if (nullEntries.length > 0) {
              points[nullEntries.pop()!] = new Point(x, y);
              setNullEntries([...nullEntries]);
              setPoints([...points]);
            } else {
              setPoints([...points, new Point(x, y)]);
            }
          }

          event.preventDefault();
        }}
        onTouchMove={event => {
          if (!canvas.current) {
            return;
          }

          const x =
            event.touches.item(0).clientX - canvas.current.getBoundingClientRect().left;
          const y =
            event.touches.item(0).clientY - canvas.current.getBoundingClientRect().top;

          if (draggingIndex !== -1) {
            points[draggingIndex]!.x = x;
            points[draggingIndex]!.y = y;
            setPoints([...points]);
            setDragged(true);
            return;
          }

          event.preventDefault();
        }}
        onTouchEnd={event => {
          if (!canvas.current) {
            return;
          }

          if (!dragged && draggingIndex !== -1) {
            points[draggingIndex] = null;
            setNullEntries([...nullEntries, draggingIndex]);
            setPoints([...points]);
            canvas.current.style.cursor = 'default';
          }

          setDraggingIndex(-1);
          setDragged(false);

          event.preventDefault();
        }}
      />
    </div>
  );
};

export default Demo;
