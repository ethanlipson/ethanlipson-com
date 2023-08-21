'use client';

import Demo from '@/src/demos/metaballs-3d/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Metaballs3D() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>3D Metaballs</h1>
      <p>
        The metaballs effect was created by Jim Blinn for Carl Sagan&apos;s show
        Cosmos. The core concept is simple, but the implementation has a lot of
        moving parts.
      </p>
      <h3>Controls</h3>
      <p>
        Click to enter interactive mode
        <br />
        Esc to exit interactive mode
        <br />
        Move mouse: rotate camera
        <br />
        W/S: move camera forward/backward
        <br />
        A/D: move camera left/right
        <br />
        E/Q: move camera up/down
        <br />
        Hold shift: move camera faster
        <br />
        Space: pause/play
      </p>
      <div style={{ height: '50px' }} />
      <h2>How it Works</h2>
      <p>
        There are four major elements to this demo: isosurfaces, marching cubes,
        GPU computation, and WebGL compute shaders.
      </p>
      <h3>Isosurfaces</h3>
      <p>
        At a high level, metaballs are based on one thing: a grid of numbers.
        This grid exists throughout space, and the metaballs simply exist where
        the numbers are big enough. In other words, metaballs are clumps of big
        numbers in this grid.
      </p>
      <img src="/images/number-grid.png" alt="Number grid" />
      <p>
        A grid like this is called a <i>scalar field</i>, since in the math
        business, we often call numbers scalars. If you pause the demo and fly
        up to the smaller spheres, you might notice some faint edges. These are
        the grid lines that make up the metaballs.
      </p>
      ---
      <p>
        But how do we actually go from a grid to a smooth metaball surface? We
        do so by splitting the grid into regions based on the numbers. An astute
        reader may notice that all of the numbers inside the red regions are
        greater than one, and all of the other numbers are less than one. The
        surface dividing these two regions is called an <i>isosurface</i>, and
        that&apos;s what we end up drawing. The name comes from the Greek
        &quot;isos&quot;, meaning &quot;equal&quot;, and because it splits the
        regions greater than one and less than one, we think of the surface as
        being equal to one everywhere, hence an &quot;equal surface&quot;.
      </p>
      <h3>Marching Cubes</h3>
      <p>
        We know that we need to construct an isosurface, but the way we do that
        isn&apos;t totally clear. Luckily an algorithm exists to do exactly
        that, called <i>marching cubes</i>. The algorithm is a bit too
        complicated to go into detail here, but for anyone interested, Sebastian
        Lague has a fantastic explanation{' '}
        <a href="https://www.youtube.com/watch?v=M3iI2l0ltbE">in video form</a>.
        The upshot is that it allows us to create something like this:
      </p>
      <img src="/images/coarse-metaballs.png" alt="Marching cubes" />
      <p>
        The fineness of the grid has been reduced for clarity, but save for the
        lack of color, this looks pretty similar to the demo shown here.
        However, there&apos;s one major problem that hasn&apos;t been addressed
        yet.
      </p>
      <h3>GPU Computation</h3>
      <p>
        Computers are only so powerful. Our processor can perform billions of
        operations every second, but even it has its limits. Graphics cards,
        surprising as it may be, are actually many, many times more powerful
        than most processors if used correctly. For the task of determining the
        shape of our metaballs, we can efficiently wield our graphics card.
      </p>
      <p>
        We can think of a computer&apos;s processor as one really smart person
        doing calculation after calculation. This works perfectly for most
        tasks, but it fails at parallelism. If we have many tasks we want to do
        at the same time, they must wait their turn to be completed, as the
        computer can only do one thing at a time. Graphics cards are the
        opposite: instead of one really smart person, the graphics card is more
        like 1,000 fifth graders. Not particularly capable on their own, sure,
        but with some organization, they can easily outmatch one person.
      </p>
      <p>
        This is where the metaballs come in: we need to calculate a number at
        each point in the grid. The calculation for each grid point is the same,
        so we can tell each fifth-grader in our graphics card to do the math for
        a few grid cells, and together, they come up with a result way faster
        than our processor could have.
      </p>
      <h3>WebGL Compute Shaders</h3>
      <p>
        The most common way to interface with graphics cards on the web is with
        WebGL. Unfortunately, WebGL only lets us send very specific instructions
        to the GPU, and if this set of instructions doesn&apos;t offer what we
        need, we&apos;re out of luck.
      </p>
      <p>
        We would like to tell the graphics card to run the metaball
        calculations. Normally, we would do this using something called a{' '}
        <i>compute shader</i>, but WebGL doesn&apos;t let us use these. Instead,
        we need to be clever about it. In this case, the solution is to tell
        WebGL to draw a picture, where the brightness of each pixel in the
        picture is the result of our metaball computation. Some may call it
        inelegant, but this allows us to utilize our GPU to its fullest
        potential.
      </p>
    </DemoTemplate>
  );
}
