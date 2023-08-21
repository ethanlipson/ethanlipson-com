'use client';

import Demo from '@/src/demos/electrons/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Electrons() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Electrons</h1>
      <p>
        The Thomson problem, initially described by J. J. Thomson in 1904,
        imagines electrons placed on the surface of a unit sphere and asks how
        they will arrange themselves to minimize electrostatic potential. This
        simulation allows us to visualize the problem as more electrons are
        added.
      </p>
      <h3>Controls</h3>
      <p>
        Left click + drag to rotate
        <br />
        Right click + drag to pan
        <br />
        Scroll to zoom
        <br />
        Left lick to add electron
        <br />
        Right click to remove electron
      </p>
      <div style={{ height: '50px' }} />
      <h2>How it Works</h2>
      <p>
        Electrons behave predictably, as dictated by Coulomb&apos;s law: the
        force with which they repeal each other is inversely proportional to the
        square of the distance between them. If we constrain them to the surface
        of a sphere, they will always eventually arrange themselves into a
        stable configuration, many of which mirror common mathematical objects.
      </p>
    </DemoTemplate>
  );
}
