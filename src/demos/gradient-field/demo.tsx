import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Expression, Parser } from 'expr-eval';
import { abs, min } from 'mathjs';
import styles from './demo.module.css';

const Demo: React.FC = () => {
  const lineLength = 15;
  const lineSpacing = 30;
  const iterations = 1000;
  const dt = 0.01;

  const canvas = useRef<HTMLCanvasElement>(null);
  const [inputExpression, setInputExpression] = useState('1, x*x+y*y');
  const [points, setPoints] = useState<{ x: number; y: number; color: string }[]>([]);
  const [moved, setMoved] = useState(false);
  const [draggingPointIndex, setDraggingPointIndex] = useState(-1);
  const [validExpression, setValidExpression] = useState(true);
  const [zoomFactor, setZoomFactor] = useState(100);
  const toScreenSpace = (
    x: number,
    y: number,
    zoomFactor: number
  ): [number, number] => {
    return [
      x * zoomFactor + canvas.current!.width / 2,
      canvas.current!.height - (y * zoomFactor + canvas.current!.height / 2),
    ];
  };
  const toFunctionSpace = (
    x: number,
    y: number,
    zoomFactor: number
  ): [number, number] => {
    return [
      (x - canvas.current!.width / 2) / zoomFactor,
      (canvas.current!.height - y - canvas.current!.height / 2) / zoomFactor,
    ];
  };
  const parseGradientFunction = (expr: string): [Expression, Expression, boolean] => {
    const [xExpr, yExpr] = expr.split(',');
    const parser = new Parser();

    try {
      const xParsed = parser.parse(xExpr);
      const yParsed = parser.parse(yExpr);
      evaluateExpression(xParsed, 10, 10);
      evaluateExpression(yParsed, 10, 10);

      return [xParsed, yParsed, true];
    } catch {
      return [parser.parse('1'), parser.parse('0'), false];
    }
  };
  const evaluateExpression = (expr: Expression, x: number, y: number): number => {
    const inputs: { x?: number; y?: number } = {};
    if (expr.variables().includes('x')) {
      inputs.x = x;
    }
    if (expr.variables().includes('y')) {
      inputs.y = y;
    }

    return expr.evaluate(inputs);
  };
  const getStep = (expr: Expression, x: number, y: number, h: number): number => {
    const df = evaluateExpression(expr, x, y);
    return h * df;
    // const k1 = evaluateExpression(expr, x, y);
    // const k2 = evaluateExpression(expr, x + h / 2, y + (k1 * h) / 2);
    // const k3 = evaluateExpression(expr, x + h / 2, y + (k2 * h) / 2);
    // const k4 = evaluateExpression(expr, x + h, y + k3 * h);
    // return (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
  };

  useEffect(() => {
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight - 50;
  }, []);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    const ctx = canvas.current.getContext('2d');
    if (!ctx) {
      console.log('Unable to create context');
      return;
    }

    const [gradientX, gradientY, valid] = parseGradientFunction(inputExpression);
    setValidExpression(valid);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    // ctx.fillStyle = '#fff';
    // ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let px = lineSpacing / 2; px < canvas.current.width; px += lineSpacing) {
      for (let py = lineSpacing / 2; py < canvas.current.height; py += lineSpacing) {
        const [x, y] = toFunctionSpace(px, py, zoomFactor);
        const dx = evaluateExpression(gradientX, x, y);
        const dy = evaluateExpression(gradientY, x, y);

        const length = Math.sqrt(dx * dx + dy * dy);
        const x1 = x + (lineLength / zoomFactor / 2) * (dx / length);
        const y1 = y + (lineLength / zoomFactor / 2) * (dy / length);
        const x2 = x - (lineLength / zoomFactor / 2) * (dx / length);
        const y2 = y - (lineLength / zoomFactor / 2) * (dy / length);

        ctx.beginPath();
        ctx.moveTo(...toScreenSpace(x1, y1, zoomFactor));
        ctx.lineTo(...toScreenSpace(x2, y2, zoomFactor));
        ctx.stroke();
      }
    }

    // Forward gradient
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      ctx.strokeStyle = point.color;

      let x = point.x;
      let y = point.y;
      ctx.beginPath();
      ctx.moveTo(...toScreenSpace(x, y, zoomFactor));

      for (let i = 0; i < iterations; i++) {
        const dx = getStep(gradientX, x, y, dt);
        const dy = getStep(gradientY, x, y, dt);
        x = x + dx;
        y = y + dy;

        if (abs(x) > 1e6 || abs(y) > 1e6) {
          break;
        }

        ctx.lineTo(...toScreenSpace(x, y, zoomFactor));
      }

      ctx.stroke();
    }

    // Backward gradient
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      ctx.strokeStyle = point.color;

      let x = point.x;
      let y = point.y;
      ctx.beginPath();
      ctx.moveTo(...toScreenSpace(x, y, zoomFactor));

      for (let i = 0; i < iterations; i++) {
        const dx = getStep(gradientX, x, y, -dt);
        const dy = getStep(gradientY, x, y, -dt);
        x = x + dx;
        y = y + dy;

        if (abs(x) > 1e6 || abs(y) > 1e6) {
          break;
        }

        ctx.lineTo(...toScreenSpace(x, y, zoomFactor));
      }

      ctx.stroke();
    }

    ctx.fillStyle = 'black';
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(...toScreenSpace(point.x, point.y, zoomFactor), 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [points, inputExpression, typeof window ?? window?.innerHeight]);

  return (
    <div className={styles['gradient-field']}>
      <canvas
        ref={canvas}
        width="640"
        height="480"
        onMouseDown={event => {
          if (!canvas.current) return;

          for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const point = points[pointIndex];
            const [pointX, pointY] = toScreenSpace(point.x, point.y, zoomFactor);

            if (
              Math.pow(
                event.clientX - canvas.current.getBoundingClientRect().x - pointX,
                2
              ) +
                Math.pow(
                  event.clientY - canvas.current.getBoundingClientRect().y - pointY,
                  2
                ) <=
              15 * 15
            ) {
              setDraggingPointIndex(pointIndex);
              break;
            }
          }

          setMoved(false);
        }}
        onMouseMove={event => {
          if (!canvas.current) return;

          let i;
          for (i = 0; i < points.length; i++) {
            const point = points[i];
            const [pointX, pointY] = toScreenSpace(point.x, point.y, zoomFactor);

            if (
              Math.pow(
                event.clientX - canvas.current.getBoundingClientRect().x - pointX,
                2
              ) +
                Math.pow(
                  event.clientY - canvas.current.getBoundingClientRect().y - pointY,
                  2
                ) <=
              15 * 15
            ) {
              canvas.current!.style.cursor = 'pointer';
              break;
            }
          }

          if (i === points.length) {
            canvas.current!.style.cursor = 'default';
          }

          if (draggingPointIndex !== -1) {
            const [x, y] = toFunctionSpace(
              event.clientX - canvas.current.getBoundingClientRect().x,
              event.clientY - canvas.current.getBoundingClientRect().y,
              zoomFactor
            );
            points[draggingPointIndex].x = x;
            points[draggingPointIndex].y = y;

            canvas.current!.style.cursor = 'pointer';
            setPoints([...points]);
          }

          setMoved(true);
        }}
        onMouseUp={event => {
          if (!canvas.current) return;

          if (!moved) {
            if (draggingPointIndex !== -1) {
              points.splice(draggingPointIndex, 1);
              console.log(3);
              setPoints([...points]);
            } else {
              const [x, y] = toFunctionSpace(
                event.clientX - canvas.current.getBoundingClientRect().x,
                event.clientY - canvas.current.getBoundingClientRect().y,
                zoomFactor
              );
              setPoints([...points, { x: x, y: y, color: 'green' }]);
            }
          }

          canvas.current!.style.cursor = 'pointer';
          setDraggingPointIndex(-1);
        }}
        onTouchStart={event => {
          if (!canvas.current) return;

          for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const point = points[pointIndex];
            const [pointX, pointY] = toScreenSpace(point.x, point.y, zoomFactor);

            if (
              Math.pow(
                event.touches.item(0).clientX -
                  canvas.current.getBoundingClientRect().x -
                  pointX,
                2
              ) +
                Math.pow(
                  event.touches.item(0).clientY -
                    canvas.current.getBoundingClientRect().y -
                    pointY,
                  2
                ) <=
              15 * 15
            ) {
              setDraggingPointIndex(pointIndex);
              break;
            }
          }

          setMoved(false);

          event.preventDefault();
        }}
        onTouchMove={event => {
          if (!canvas.current) return;

          let i;
          for (i = 0; i < points.length; i++) {
            const point = points[i];
            const [pointX, pointY] = toScreenSpace(point.x, point.y, zoomFactor);

            if (
              Math.pow(
                event.touches.item(0).clientX -
                  canvas.current.getBoundingClientRect().x -
                  pointX,
                2
              ) +
                Math.pow(
                  event.touches.item(0).clientY -
                    canvas.current.getBoundingClientRect().y -
                    pointY,
                  2
                ) <=
              15 * 15
            ) {
              canvas.current!.style.cursor = 'pointer';
              break;
            }
          }

          if (i === points.length) {
            canvas.current!.style.cursor = 'default';
          }

          if (draggingPointIndex !== -1) {
            const [x, y] = toFunctionSpace(
              event.touches.item(0).clientX - canvas.current.getBoundingClientRect().x,
              event.touches.item(0).clientY - canvas.current.getBoundingClientRect().y,
              zoomFactor
            );
            points[draggingPointIndex].x = x;
            points[draggingPointIndex].y = y;

            canvas.current!.style.cursor = 'pointer';
            setPoints([...points]);
          }

          setMoved(true);

          event.preventDefault();
        }}
        onTouchEnd={event => {
          if (!canvas.current) return;

          if (!moved) {
            if (draggingPointIndex !== -1) {
              points.splice(draggingPointIndex, 1);
              console.log(3);
              setPoints([...points]);
            } else {
              const [x, y] = toFunctionSpace(
                event.changedTouches.item(0).clientX -
                  canvas.current.getBoundingClientRect().x,
                event.changedTouches.item(0).clientY -
                  canvas.current.getBoundingClientRect().y,
                zoomFactor
              );
              setPoints([...points, { x: x, y: y, color: 'green' }]);
            }
          }

          canvas.current.style.cursor = 'pointer';
          setDraggingPointIndex(-1);

          event.preventDefault();
        }}
      />
      <input
        onFocus={() => {
          // canvas.current!.style.height = (window.innerHeight - 50).toString() + 'px';
        }}
        onChange={event => {
          setInputExpression(event.target.value);
          // canvas.current!.style.height = window.innerHeight.toString() + 'px';
          // canvas.current!.height = window.innerHeight + window;
        }}
        defaultValue="1, x*x+y*y"
        style={{
          border: '3px solid ' + (validExpression ? 'green' : 'red'),
        }}
      />
    </div>
  );
};

export default Demo;
