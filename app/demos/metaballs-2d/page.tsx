'use client';

import Demo from '@/src/demos/metaballs-2d/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Metaballs2D() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>2D Metaballs</h1>
      <p>
        The metaballs effect was created by Jim Blinn for Carl Sagan&apos;s show
        Cosmos. The core concept is simple, but the implementation has a lot of
        moving parts.
      </p>
      <p>
        <b>Controls</b>
      </p>
    </DemoTemplate>
  );
}
