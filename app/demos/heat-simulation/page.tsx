'use client';

import Demo from '@/src/demos/heat-simulation/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function HeatSimulation() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Heat Simulation</h1>
      <p>
        The rules for how heat spreads are some of the simplest in physics, but
        they can still lead to fascinating phenomena.
      </p>
      <h3>Controls</h3>
      <p>Click and drag to add heat</p>
      <div style={{ height: '50px' }} />
      <h2>How it Works</h2>
      <p>
        Heat spread is governed by an equation unceremoniously titled the{' '}
        <a href="https://en.wikipedia.org/wiki/Heat_equation">heat equation</a>.
        It may look confusing, but its meaning is actually highly intuitive.
      </p>
      <h3>The Heat Equation</h3>
      <p>
        The heat equation doesn&apos;t exactly tell us what the heat should be.
        Instead, it tells us how the heat should change as time goes on. This
        might make more sense if you&apos;ve taken calculus, but if you know
        something should change at every moment in time, you can construct a
        perfect image of it just by combining all of the little changes.
      </p>
      <p>
        Specifically, the equation tells us that the change in heat,{' '}
        <i>du/dt</i>, is equal to the <i>Laplacian</i> of the heat, &#916;
        <i>u</i>. The Laplacian tells us how much the value at a certain point
        differs from its neighbors, which should make sense: if the heat in a
        certain area is really different from its neighbors, it should change a
        lot. If it&apos;s the same as its neighbors, it shouldn&apos;t change at
        all.
      </p>
    </DemoTemplate>
  );
}
