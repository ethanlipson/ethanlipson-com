'use client';

import Demo from '@/src/demos/flow/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Flow() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Flow</h1>
      <p>Flow simulation using the Lattice-Boltzmann method</p>
      <h3>Controls</h3>
      <p>Draw with your mouse or finger!</p>
    </DemoTemplate>
  );
}
