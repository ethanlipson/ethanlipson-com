'use client';

import Demo from '@/src/demos/jets/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Jets() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Dye Jets</h1>
      <p>
        Jets of dyed water based on Jos Stam&apos;s Stable Fluids algorithm.
      </p>
      <h3>Controls</h3>
      <p>Space: pause/play (only after clicking the simulation)</p>
    </DemoTemplate>
  );
}
