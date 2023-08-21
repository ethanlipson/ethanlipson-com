'use client';

import Demo from '@/src/demos/strange-attractors/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function StrangeAttractors() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Strange Attractors</h1>
      <p>
        Dynamical systems visualized using WebGL, accelerated with GPU compute.
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
        <br />
        Space: pause/play
      </p>
    </DemoTemplate>
  );
}
