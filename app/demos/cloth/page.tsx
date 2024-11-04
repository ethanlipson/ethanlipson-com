"use client";

import Demo from "@/src/demos/cloth/demo";
import DemoTemplate from "@/src/components/demoTemplate";

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
        Drag the cloth to move it around
        <br />
        Scroll while dragging cloth to move it closer/farther
        <br />R to reset simulation
      </p>
    </DemoTemplate>
  );
}
