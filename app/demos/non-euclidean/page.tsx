'use client';

import Demo from '@/src/demos/non-euclidean/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function NonEuclidean() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Non-Euclidean Worlds</h1>
      <p>
        A world where the shortest distance between two points may not be a
        straight line. Inspired by CodeParade&apos;s video on the same topic.
        Try walking between the arches!
      </p>
      <h3>Controls</h3>
      <p>
        WASD: walk around
        <br />
        Hold shift to walk quickly
        <br />
        Mouse: look around
      </p>
    </DemoTemplate>
  );
}
