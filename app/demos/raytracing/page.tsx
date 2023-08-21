'use client';

import Demo from '@/src/demos/raytracing/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Raytracing() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Raytracing</h1>
      <p>
        This is a realtime implementation of{' '}
        <a href="https://raytracing.github.io/">Ray Tracing in One Weekend</a>.
        The tutorial covers how to build a CPU raytracer that renders singular
        images. This is a GPU-accelerated raytracer that runs at interactive
        rates!
      </p>
      <h3>Controls</h3>
      <p>
        Click to enter interactive mode
        <br />
        Esc to exit interactive mode
        <br />
        Move mouse: rotate camera
        <br />
        W/S: move camera forward/backward
        <br />
        A/D: move camera left/right
        <br />
        E/Q: move camera up/down
        <br />
        Hold shift: move camera faster
      </p>
    </DemoTemplate>
  );
}
