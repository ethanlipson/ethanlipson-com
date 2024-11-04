"use client";

import Demo from "@/src/demos/boids/demo";
import DemoTemplate from "@/src/components/demoTemplate";

export default function Boids() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Boids</h1>
      <p>
        Boids, short for &quot;bird-oids&quot;, are one of the first examples of
        artificial life, an attempt to describe the behavior of living things
        using only a handful of simple rules. An individual boid is not
        particularly interesting, but together, they can display complex
        flocking behavior.
      </p>
      <h3>Controls</h3>
      <p>
        Drag to look around
        <br />
        Press space to pause/play
      </p>
      <div style={{ height: "50px" }} />
      <h2>How it Works</h2>
      <p>
        Despite being able to form large clusters, the boids themselves only
        follow three simple rules: alignment, separation, and cohesion. These
        rules were determined to best emulate the behavior of animals in nature,
        like a school of fish or a flock of birds.
      </p>
      <h3>Alignment</h3>
      <p>
        This rule states that boids must always attempt to align their direction
        with that of their neighbors. If a boid is heading left while all of the
        boids near it are heading right, then our boid should steer right to
        join the rest of the group.
      </p>
      <h3>Cohesion</h3>
      <p>
        This rule states that boids must always move towards the center of their
        local flock. Cohesion ensures that boids form nice, uniform flocks, and
        that they will fill any holes that arise. However, if we just have this
        rule, boids will clump up into tight clusters, which is why we have...
      </p>
      <h3>Separation</h3>
      <p>
        This rule states that boids cannot get too close to their neighbors.
        While this rule is not as clear as the previous two, it&apos;s necessary
        to ensure that boids don&apos;t clump together, instead forming evenly
        spaced groups.
      </p>
      <h3>Bringing it all Together</h3>
      <p>
        Once we have these three rules, we can adjust their strengths to give us
        a total force applied on each boid. If we increase the separation
        strength, for example, boids will steer aggressively away from their
        neighbors, but if we relax the separation strength, they&apos;ll take
        their time to get there. The values chosen for this simulation work
        well, but they can be adjust with the slider in the top left (you may
        need to close this description).
      </p>
    </DemoTemplate>
  );
}
