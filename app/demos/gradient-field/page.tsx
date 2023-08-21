'use client';

import Demo from '@/src/demos/gradient-field/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function GradientField() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Gradient Field</h1>
      <p>
        In engineering, it&apos;s often easier to describe phenomena in terms of
        a differential equation. Write the <i>x</i> and <i>y</i> components of a
        gradient field, or just <i>1</i> and <i>y&apos;</i> for slope, to see
        the results, and click and drag to see how paths evolve.
      </p>
      <p>
        <b>Controls</b>
      </p>
    </DemoTemplate>
  );
}
