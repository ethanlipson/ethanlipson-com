"use client";

import PageTemplate from "@/src/components/pageTemplate";
import "../../globals.css";
import "katex/dist/katex.min.css";
import InfoBox from "@/src/components/infoBox";
import Latex from "react-latex-next";
import Image from "next/image";
import problemStatementUnlabeled from "@/public/media/writing/bead-on-a-ring/problem-statement-unlabeled.png";
import problemStatementLabeled from "@/public/media/writing/bead-on-a-ring/problem-statement-labeled.png";
import bifurcationDiagram from "@/public/media/writing/bead-on-a-ring/bifurcation-diagram.png";
import stability from "@/public/media/writing/bead-on-a-ring/stability.png";
import omega1stability from "@/public/media/writing/bead-on-a-ring/omega-1-stability.png";
import omega5stability from "@/public/media/writing/bead-on-a-ring/omega-5-stability.png";
import bifurcationDiagramWithStability from "@/public/media/writing/bead-on-a-ring/bifurcation-diagram-with-stability.png";
import sin2theta from "@/public/media/writing/bead-on-a-ring/sin2theta.png";
import Link from "next/link";

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Worked Example: Bead on a Ring</h3>
      <h5>May 25, 2025</h5>
      <p>
        I recently worked through a problem that incorporated aspects of
        analytical mechanics and dynamical systems. Since it&apos;s such a great
        showcase of both techniques, I deicded to share it here. The problem is
        simple:
      </p>
      <p className="italic">
        Suppose you have a bead sliding along an upright ring, and the ring is
        rotating around a vertical axis at a constant speed. Describe the
        dynamics of the bead.
      </p>
      <div className="flex justify-center">
        <Image
          src={problemStatementUnlabeled}
          alt="problem-statement-unlabeled"
          className="w-1/3 min-w-72"
        />
      </div>
      <p>
        When the ring is still, we know the bead will simply rock back and
        forth. But as the ring begins spinning, we might expect that the
        centrifugal force causes the bead to be pushed towards the side. As it
        turns out, we can get a pretty precise answer to this problem!
      </p>
      <h4>The Equation of Motion</h4>
      <InfoBox title="Dot Notation">
        <p>
          In mechanics, we often use{" "}
          <span className="italic">dot notation</span> to denote time
          derivatives. For instance, if <Latex>$\theta$</Latex> is a
          time-dependent variable, then
        </p>
        <Latex>{`$$\\dot\\theta = \\frac{\\mathrm{d}\\theta}{\\mathrm{d}t}$$`}</Latex>
        <Latex>{`$$\\ddot\\theta = \\frac{\\mathrm{d}^2\\theta}{\\mathrm{d}t^2}$$`}</Latex>
        <p>
          Of course we could keep going with more dots, but as it turns out,
          physics almost never has time derivatives higher than second order.
        </p>
      </InfoBox>
      <p>
        3Blue1Brown&apos;s advice for solving problems is that before anything
        else, we should give things names. So let&apos;s label the diagram from
        before.
      </p>
      <div className="flex justify-center">
        <Image
          src={problemStatementLabeled}
          alt="problem-statement-labeled"
          className="w-1/3 min-w-72"
        />
      </div>
      Here we have
      <ul className="list-disc ml-8">
        <li>
          <Latex>$\theta$</Latex> - the angle of the bead from the vertical
        </li>
        <li>
          <Latex>$\omega$</Latex> - the rotating speed of the ring
        </li>
        <li>
          <Latex>$R$</Latex> - the radius of the ring
        </li>
        <li>
          The bead has mass <Latex>$m$</Latex> (not labeled)
        </li>
      </ul>
      <p>
        We&apos;ll consider <Latex>$R$</Latex> and <Latex>$\omega$</Latex> as
        fixed (i.e. the ring rotates at a constant speed), so the only
        coordinate to vary is <Latex>$\theta$</Latex>. From here, we can use
        Lagrangian mechanics to determine how the system evolves.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{" "}
        We end up getting
      </p>
      <Latex>
        $$\ddot\theta = \tfrac12\omega^2\sin2\theta - \tfrac gR\sin\theta$$
      </Latex>
      <p>
        The above equation, called the{" "}
        <span className="italic">equation of motion</span> for the system, tells
        us exactly how <Latex>$\theta$</Latex> evolves over time. We can
        understand each term separately:
      </p>
      <ul className="list-disc ml-8">
        <li>
          Recall how <Latex>$F = ma$</Latex>, and acceleration is just the
          second derivative of position. This means that{" "}
          <Latex>$\ddot\theta$</Latex> corresponds to the force applied to the
          bead, so the right-hand side tells us what the force is on the bead
          for each <Latex>$\theta$</Latex>.
        </li>
        <li>
          When <Latex>$\omega = 0$</Latex>, the first term vanishes and
          we&apos;re left with the equation of motion for a pendulum. This
          suggests that the <Latex>$-\frac gR\sin\theta$</Latex> term accounts
          for gravity.
        </li>
        <li>
          The <Latex>$\frac12\omega^2\sin2\theta$</Latex> term is responsible
          for the centrifugal force. The idea is that the{" "}
          <Latex>$\sin2\theta$</Latex> pushes the bead towards the sides,
          changing sign depending on whether it&apos;s pushing clockwise or
          counterclockwise, while the <Latex>$\frac12\omega^2$</Latex> controls
          the intensity. This sign-changing behavior is shown in the following
          image:
        </li>
      </ul>
      <div className="flex justify-center">
        <Image src={sin2theta} alt="sin-2-theta" className="w-72" />
      </div>
      <p>
        We can use the equation of motion to numerically simulate our system.
        Here are a few examples with <Latex>$R = 1$</Latex> and{" "}
        <Latex>$g = 9.81$</Latex>. Note that because the equation of motion does
        not include <Latex>$m$</Latex>, it has no bearing on the dynamics of our
        system, so we don&apos;t need to specify it.
      </p>
      <div className="flex justify-center text-center gap-4">
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/omega_0.mp4" />
          </video>
          <Latex>$\omega = 0$</Latex>
        </div>
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/omega_3.mp4" />
          </video>
          <Latex>$\omega = 3$</Latex>
        </div>
      </div>
      <div className="flex justify-center text-center gap-4">
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/omega_4.mp4" />
          </video>
          <Latex>$\omega = 4$</Latex>
        </div>
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/omega_8.mp4" />
          </video>
          <Latex>$\omega = 8$</Latex>
        </div>
      </div>
      <p>
        The centrifugal force gets stronger as <Latex>$\omega$</Latex> grows.
        For smaller values of <Latex>$\omega$</Latex>, it simply slows the
        oscillation of the bead around the center. But as it grows larger, the
        bead is forced up against the sides of the ring. Looking at these
        videos, it seems like something happens between <Latex>$3$</Latex> and{" "}
        <Latex>$4$</Latex>, since the bead stops oscillating around the center.
      </p>
      <h4>Dynamical Systems</h4>
      <p>
        It might seem that we&apos;ve gone as far as we can go; nonlinear ODEs
        are hard to solve in general, and this one really seems hopeless. But
        there&apos;s quite a bit we can say without finding an explicit
        solution! The most noticeable thing is that center of oscillation
        changes with <Latex>$\omega$</Latex>: for small <Latex>$\omega$</Latex>,
        the bead oscillates around the center, but when <Latex>$\omega$</Latex>{" "}
        passes a certain threshold, it starts oscillating around a higher point.
        How do these centers change? More generally, how can we describe the
        oscillations, stabilities and instabilities of our system?
      </p>
      <p>
        The first step is to find the{" "}
        <span className="italic">fixed points</span> of our system, which occur
        when <Latex>$\dot\theta = 0$</Latex> and{" "}
        <Latex>$\ddot\theta = 0$</Latex>, i.e. when the bead isn&apos;t moving
        and has no forces on it. The first condition is easy enough to
        understand: clearly the bead is not at a &quot;fixed point&quot; if
        it&apos;s moving. But the second one is a little harder. Since{" "}
        <Latex>$\ddot\theta$</Latex> is a function of <Latex>$\theta$</Latex>,
        we need to find all <Latex>$\theta$</Latex> such that{" "}
        <Latex>
          $\ddot\theta = \frac12\omega^2\sin2\theta - \frac gR\sin\theta = 0$
        </Latex>
        .
      </p>
      <p>
        We can visualize the zeroes of <Latex>$\ddot\theta$</Latex> by plotting
        the function directly. Fixing <Latex>$R = 1$</Latex> and{" "}
        <Latex>$g = 9.81$</Latex> as before, let&apos;s see what the zeroes are
        as we vary <Latex>$\omega$</Latex>.
      </p>
      <div className="flex justify-center">
        <video className="w-[30rem]" autoPlay loop muted>
          <source src="/media/writing/bead-on-a-ring/bifurcation.mp4" />
        </video>
      </div>
      <p>
        Interesting! It appears that as <Latex>$\omega$</Latex> passes some
        threshold, we gain two new fixed points. This threshold turns out to be{" "}
        <Latex>{`$|\\omega| \\geq \\cos^{-1}(\\frac{g}{R\\omega^2})$`}</Latex>.
        <sup>
          <a id="footnote-2-ref" href="#footnote-2">
            [2]
          </a>
        </sup>{" "}
        If we plot the locations of these fixed points versus the parameter{" "}
        <Latex>$\omega$</Latex>, we get
      </p>
      <div className="flex justify-center">
        <Image
          src={bifurcationDiagram}
          alt="bifurcation-diagram"
          className="w-[30rem]"
        />
      </div>
      <p>
        For small values of <Latex>$\omega$</Latex>, the only fixed point is in
        the center. But just past <Latex>$\omega = 3$</Latex>,
        <sup>
          <a id="footnote-3-ref" href="#footnote-3">
            [3]
          </a>
        </sup>{" "}
        the single fixed point splits into three. The above diagram is called a{" "}
        <span className="italic">bifurcation diagram</span>, and the specific
        form of this one is called a{" "}
        <span className="italic">pitchfork bifurcation</span> (you&apos;ll never
        guess why).
      </p>
      <p>
        However, not all fixed points are created equal, which is why the next
        step is to discuss their <span className="italic">stability</span>.
        Stability can be perfectly encapsulated by the following image:
      </p>
      <div className="flex justify-center">
        <Image src={stability} alt="stability" className="w-[30rem]" />
      </div>
      <p>
        Consider two balls on a hill with the above configuration. Both are at
        fixed points, so under ideal conditions neither will move. But if we
        nudge each ball, the left one will return to the center while the right
        one will keep rolling away. We call the left fixed point{" "}
        <span className="italic">stable</span> and the right one{" "}
        <span className="italic">unstable</span>.
      </p>
      <p>
        Returning back to our study of the bead on a ring, let&apos;s consider
        the stability of the fixed points of <Latex>$\theta$</Latex>. For the
        balls on the hill, we considered how the force of gravity behaved near
        the fixed points. We can do the same thing with the bead, recalling that{" "}
        <Latex>$\ddot\theta$</Latex> represents the force on the bead. To that
        end, let&apos;s take a look at <Latex>$\ddot\theta$</Latex> when{" "}
        <Latex>$\omega = 1$</Latex>.
      </p>
      <div className="flex justify-center">
        <Image
          src={omega1stability}
          alt="omega-1-stability"
          className="w-[30rem]"
        />
      </div>
      <p>
        When <Latex>$\theta &gt; 0$</Latex>, <Latex>$\ddot\theta$</Latex> is
        negative, pushing the bead back towards the center. Conversely, when{" "}
        <Latex>$\theta &lt; 0$</Latex>, <Latex>$\ddot\theta$</Latex> is
        positive, again pushing the bead back towards the center. It seems like
        the neighboring forces keep the bead at the origin, confirming that this
        fixed point is stable. We can compare this against the case when{" "}
        <Latex>$\omega = 5$</Latex>.
      </p>
      <div className="flex justify-center">
        <Image
          src={omega5stability}
          alt="omega-5-stability"
          className="w-[30rem]"
        />
      </div>
      <p>
        The two fixed points at <Latex>$\theta = \pm1.17$</Latex> are stable for
        the same reason as above. However, the fixed point at{" "}
        <Latex>$\theta = 0$</Latex> is no longer stable: for positive{" "}
        <Latex>$\theta$</Latex>, <Latex>$\ddot\theta$</Latex> is also positive,
        pushing the bead further away from the center. The same thing happens
        for negative <Latex>$\theta$</Latex>, so we can say that this fixed
        point is unstable. We can amend our previous bifurcation diagram to
        reflect this shift in stability:
      </p>
      <div className="flex justify-center">
        <Image
          src={bifurcationDiagramWithStability}
          alt="bifurcation-diagram-with-stability"
          className="w-[30rem]"
        />
      </div>
      <p>
        When the middle prong of a pitchfork is unstable while the rest is
        stable, we call it a <span className="italic">supercritical</span>{" "}
        pitchfork bifurcation. If you follow the diagram from right to left, you
        can think of the outer two fixed points coalescing into the center and
        absorbing the instability.
      </p>
      <p>
        So the natural question to ask is, exactly when does the stable fixed
        point in the center become unstable? It turns out that this is very easy
        to answer. The transition happens when the slope of{" "}
        <Latex>$\frac12\omega^2\sin2\theta - \frac gR\sin\theta$</Latex> at the
        origin turns from negative to positive, so we can just solve
      </p>
      <Latex>{`$$\\frac{\\mathrm{d}}{\\mathrm{d}\\theta}(\\tfrac12\\omega^2\\sin2\\theta - \\tfrac gR\\sin\\theta)\\bigg|_{\\theta=0} = 0$$`}</Latex>
      <p>
        for <Latex>$\omega$</Latex>, which gives{" "}
        <Latex>{`$|\\omega| = \\sqrt{\\frac gR}$`}</Latex>. So when the hoop is
        spinning slower than <Latex>$\sqrt\frac gR$</Latex>, the bead will
        always settle at the bottom, but not when it spins any faster.
      </p>
      <h4>Escaping the Cycle</h4>
      <p>
        The bead doesn&apos;t always have to oscillate around some point,
        though. We can imagine that if the bead started off spinning really
        quickly, it would just keep looping around the ring forever. The idea
        here is that at low speeds, the bead is stuck in an &quot;energy
        valley&quot; that&apos;s impossible to escape. But if the bead is going
        fast enough, it has the energy to escape the valley and summit the
        &quot;energy hump&quot;, so to speak. We can illustrate this idea quite
        literally:
      </p>
      <div className="flex justify-center">
        <div className="flex flex-col">
          <video className="w-[30rem]" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/energy-valley.mp4" />
          </video>
          <video className="w-[30rem]" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/energy-hump.mp4" />
          </video>
        </div>
      </div>
      <p>
        The top ball doesn&apos;t have enough energy to make it over the hill,
        so it stays stuck in the valley. But the bottom ball can make it over,
        so it keeps going forever.
      </p>
      <p>
        Checking if the ball will make it over the hill is actually pretty easy:
        all we have to do is compute the energy of a still ball at the top of
        the hill. If our ball has that much energy, it&apos;ll make it over, and
        if it doesn&apos;t, then it&apos;ll remain stuck. The idea is that the
        summit is the highest energy state, so if the ball can make it over,
        then it has enough energy to reach any state.
      </p>
      <p>
        It turns out that, because our system conserves energy, the
        highest-energy point is always an unstable fixed point. We already know
        about one unstable fixed point, the one at the bottom of the ring. But
        there&apos;s actually another you might not have noticed: the one at the
        top of the ring! This point has height <Latex>$R$</Latex>, so its
        potential energy is <Latex>$mgh = mgR$</Latex>. There&apos;s no kinetic
        energy since we&apos;re considering a still bead, so the total energy
        here is <Latex>$mgR$</Latex>.
      </p>
      <p>
        The implication is that if a bead has energy at least{" "}
        <Latex>$mgR$</Latex>, then it&apos;ll make a full loop around the ring.
        For example, if we consider a bead starting at the bottom (
        <Latex>$\theta = 0$</Latex>), then its initial speed must be greater
        than <Latex>$\dot\theta = 2\sqrt\frac gR$</Latex> to reach the top. We
        can see what happens when we&apos;re just above and just below this
        threshold:
      </p>
      <div className="flex justify-center text-center">
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/below-separatrix.mp4" />
          </video>
          <Latex>$\dot\theta = 2\sqrt\frac gR - 0.01$</Latex>
        </div>
        <div className="flex-col items-center">
          <video className="w-72" autoPlay loop muted>
            <source src="/media/writing/bead-on-a-ring/above-separatrix.mp4" />
          </video>
          <Latex>$\dot\theta = 2\sqrt\frac gR + 0.01$</Latex>
        </div>
      </div>
      <p>
        A trajectory that divides the state space into isolated regions (in this
        case, &quot;low-energy&quot; and &quot;high-energy&quot;) is called a{" "}
        <span className="italic">separatrix</span>, and the trajectory starting
        with <Latex>$\dot\theta = 2\sqrt\frac gR$</Latex> is an example of one.
        As an aside, it&apos;s an interesting result that this initial speed
        does not depend on <Latex>$\omega$</Latex> at all. Perhaps this is
        because the difficulty of rising to the top of the ring and resisting
        the centrifugal force is exactly counteracted by the boost that the
        centrifugal force gives when the bead first starts climbing.
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          I initially included a derivation of the equation of motion, but
          without a proper explanation of the method it seemed unmotivated. The
          steps are
          <ul className="list-disc ml-8">
            <li>
              Find the Lagrangian <Latex>$\mathcal L = T - V$</Latex>, the
              difference between kinetic and potential energy. For this system,
              we have{" "}
              <Latex>
                $T = \frac12mR^2\dot\theta^2 + \frac12m\omega^2R^2\sin^2\theta$
              </Latex>{" "}
              and <Latex>$V = -mgR\cos\theta$</Latex>.
            </li>
            <li>
              Substitute our expression for <Latex>$\mathcal L$</Latex> into the
              Euler-Lagrange equation
            </li>
            <Latex>{`$$\\frac{\\mathrm{d}}{\\mathrm{d}t}\\frac{\\partial\\mathcal L}{\\partial\\dot\\theta} - \\frac{\\partial\\mathcal L}{\\partial\\theta} = 0$$`}</Latex>
            <li>
              Solve the resulting equation for <Latex>$\ddot\theta$</Latex>
            </li>
          </ul>
          It&apos;s a surprisingly easy set of steps, but delving into why this
          works is beyond the scope of this article, and it doesn&apos;t make
          sense to introduce it without an explanation.{" "}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          To see this, solve <Latex>$\ddot\theta = 0$</Latex> for{" "}
          <Latex>$\theta$</Latex> and leverage the identity{" "}
          <Latex>$\sin2\theta = 2\sin\theta\cos\theta$</Latex>.{" "}
          <a href="#footnote-2-ref">&#8617;</a>
        </li>
        <li id="footnote-3">
          It actually splits at <Latex>$\sqrt g \approx 3.13$</Latex>, which is
          remarkably close to <Latex>$\pi$</Latex>. Surprisingly, this is not a
          coincidence, since hundreds of years ago, the meter was defined to
          satisfy the relation <Latex>$\pi^2 = g$</Latex>. More details{" "}
          <a href="https://math.stackexchange.com/a/1649360" target="_blank">
            here
          </a>
          . <a href="#footnote-3-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
