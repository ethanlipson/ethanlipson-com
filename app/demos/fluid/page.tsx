"use client";

import Demo from "@/src/demos/fluid/demo";
import DemoTemplate from "@/src/components/demoTemplate";

export default function Fluid() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Fluid Simulation</h1>
      <p>
        Computation fluid dynamics, usually just called fluid simulation, is an
        integral part of aerospace, weather prediction, computer graphics, and
        just about any other field of engineering. This version is an
        implementation of{" "}
        <a href="https://mmacklin.com/pbf_sig_preprint.pdf">
          Position Based Fluids
        </a>{" "}
        by Macklin and M&#252;ller.
      </p>
      <h3>Controls</h3>
      <p>Drag the water to manipulate it</p>
      <div style={{ height: "50px" }} />
      <h2>How it Works</h2>
      <p>
        In order to understand how fluid simulation works, we must first
        understand the basics of particle simulation. Then, we can move on to
        what makes this specific simulation interesting.
      </p>
      <h3>Particle Simulation</h3>
      <p>
        Many physical phenomena can be modeled with particles, such as fire,
        dirt, air, water, and even living things. In this case, we are modeling
        a liquid using around 15,000 particles. Each particle keeps track of two
        values: its position and its velocity, so all we have to do each frame
        is each particle&apos;s position and velocity. If we can do that
        efficiently and realistically, we can create fascinating simulations.
      </p>
      <img src="/media/demos/images/particles.png" alt="Particles" />
      <h3>Fluid Particles</h3>
      <p>
        If we&apos;re using particle simulation as our framework, then the
        question becomes, &quot;how can we distill the essence of fluid into a
        particle update rule?&quot; For centuries, mathematicians and physicists
        have attempted to answer this question, the most substantial of which
        has been the{" "}
        <a href="https://wikipedia.org/wiki/Navier-Stokes_equations">
          Navier-Stokes equations
        </a>
        .
      </p>
      <p>
        For Position Based Fluids, a different approach is used. A key
        observation of water is that it keeps a constant density; no matter
        what&apos;s happening, it remains at 1,000 kg/m&sup3;. Thus, we can
        achieve a water-like effect by moving around the particles each frame to
        as closely match the density of water as possible. If the particles are
        too far apart, we move them close together, and if they&apos;re too
        compact, we move them apart.
      </p>
      <h3>Vorticity Confinement</h3>
      <p>
        The technique of enforcing constant density already gets us a pretty
        good simulation, but there&apos;s one more trick here that really seals
        the deal. It&apos;s a nearly universal fact that the more <i>action</i>{" "}
        a simulation has, the more it grabs the viewer&apos;s attention. In this
        case, action corresponds to high turbulance, with water flowing every
        which way.
      </p>
      <p>
        We can quantify this &quot;chaos factor&quot; using a mathematical
        quantity called <i>curl</i>. When we find areas with high curl, we
        amplify it further, thus creating larger splashes and waves. This
        technique is called <i>vorticity confinement</i>, because it focuses on
        areas where fluid is moving in a vortex shape.
      </p>
    </DemoTemplate>
  );
}
