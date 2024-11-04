"use client";

import Demo from "@/src/demos/gravity/demo";
import DemoTemplate from "@/src/components/demoTemplate";

export default function Gravity() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Particle Gravity</h1>
      <p>Particles falling toward/orbiting around a center of gravity.</p>
      <h3>Controls</h3>
      <p>Tap/click to move the center of gravity</p>
    </DemoTemplate>
  );
}
