'use client';

import Demo from '@/src/demos/pendulum/demo';
import DemoTemplate from '@/src/components/demoTemplate';
import Link from 'next/link';

export default function Pendulum() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Multi-Pendulum</h1>
      <p>
        The multi-pendulum is a classic example of a chaotic system. Even with
        the simplest starting conditions, it quickly becomes nearly impossible
        to predict. This simulation models a pendulum with 5 masses, using
        Matthias M&#252;ller&apos;s{' '}
        <a href="https://matthias-research.github.io/pages/publications/posBasedDyn.pdf">
          Position Based Dynamics
        </a>{' '}
        framework.
      </p>
      <div style={{ height: '50px' }} />
      <h2>How it Works</h2>
      <p>
        The equations describing a pendulum get{' '}
        <a href="https://jakevdp.github.io/blog/2017/03/08/triple-pendulum-chaos/">
          complicated quickly
        </a>
        , so it&apos;s best to avoid them. The trick to modeling a pendulum like
        this isn&apos;t to find equations that govern its motion, but to find a
        way to model rigid behavior in general, and then apply it to this
        problem. The Position Based Dynamics framework has stood the test of
        time for modeling physical systems, and it can be easily applied to a
        pendulum.
      </p>
      <h3>Position Based Dynamics</h3>
      <p>
        The fundamental idea behind Position Based Dynamics is that each weight
        in our pendulum shuold maintain a constant distance from its neighbors.
        If at the start of the simulation, each weight is one meter apart, then
        every subsequent frame, we move it so it&apos;s always one meter apart
        from each of its neighbors. If we do this for each weight a few times
        per frame, we can get a realistic-looking simulation with minimal
        computation. This concept of maintaing a constant distance is called a{' '}
        <i>distance constraint</i>.
      </p>
      <p>
        Position Based Dynamics isn&apos;t just useful for pendulums, though. It
        can be used to model just about anything, including cloth, buildings,
        fluids, vehicles, Here on my website, I used it to model{' '}
        <Link href="/demos/fluid">
          <a>water flowing in a box</a>
        </Link>
        .
      </p>
    </DemoTemplate>
  );
}
