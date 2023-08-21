'use client';

import Demo from '@/src/demos/cloth/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Cloth() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Cloth</h1>
      <p>
        GPU-accelerated cloth simulation using WebGL fragment shaders for
        parallel computation. Built within the Position Based Dynamics
        framework, this simulation is performant and extremely stable.
      </p>
      <h3>Controls</h3>
      <p>
        Left click + drag to move cloth
        <br />
        Scroll while dragging cloth to change depth
        <br />
        Space to pause/play
        <br />
        R to reset scene
        <br />
        WASD + EQ to move camera
        <br />
        Right click + drag to rotate camera
        <br />
        Hold shift to speed up camera movement
      </p>
    </DemoTemplate>
  );
}
