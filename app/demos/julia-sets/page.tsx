'use client';

import Demo from '@/src/demos/julia-sets/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function JuliaSets() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Julia Sets</h1>
      <p>
        Julia sets, first described by Gaston Julia, have fascinating
        mathematical properties and are closely related to the Mandelbrot set.
        Besides all that math, though, they&apos;re also just really cool to
        look at.
      </p>
      <h3>Controls</h3>
      <p>
        <b>Desktop</b>
        <br />
        Left click + drag to change shape (when zoomed out)
        <br />
        Right click + drag to pan
        <br />
        Scroll to zoom
      </p>
      <p>
        <b>Mobile</b>
        <br />
        Touch to change shape (when zoomed out)
        <br />
        Pinch to zoom and pan
      </p>
      <div style={{ height: '50px' }} />
      <h2>How it Works</h2>
      <p>
        The math behind Julia sets is not complicated, but at the same time,
        it&apos;s pretty abstract and doesn&apos;t have a clear real-world
        analogue. Their importance is less behind the fractals themselves, but
        the fact that we can model them as easily as we can.
      </p>
      <h3>The Math</h3>
      <p>
        For each pixel in the Julia Set, we repeatedly compute a mathematical
        function&sup1; and see how fast it grows. If it grows faster than a
        specified limit, we color that pixel depending on how long it took to
        reach that limit. Otherwise, we color it black.
      </p>
      <p>
        You may notice that for some configurations, there are large sections of
        black pixels. All of these pixels grow slow enough that they never reach
        the boundary. In fact, if you gather all of the configurations that have
        these swaths of black pixels, you get the Mandelbrot Set.
      </p>
      <p style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}>
        &sup1; Specifically, we iterate the function <i>z&sup2; + c</i>, where{' '}
        <i>c</i> is the pixel selected with the mouse and <i>z</i> is the pixel
        currently being rendered.
      </p>
      <h3>Fractal Nature</h3>
      <p>
        If you zoom in enough, you may notice that the same patterns appear on
        multiple levels of the Julia Set; this is no visual glitch. Julia Sets
        are self similar, meaning that when you zoom in, they look like a
        rotated version of themselves.
      </p>
      <p>
        We also say that the Julia set is a fractal. We often assume that
        fractals are self-similar, and although that&apos;s true in this case,
        in general it&apos;s not. Here, fractal just means that the dimension of
        the Julia Set is somewhere between 1 and 2. You may be tempted to say
        that it&apos;s 2-dimensional, but this is technically untrue, since it
        has an infinite amount of holes and thus has area zero. At the same
        time, it&apos;s more complicated than a 1-dimensional line, so it has to
        sit somewhere in the middle.
      </p>
    </DemoTemplate>
  );
}
