"use client";

import PageTemplate from "@/src/components/pageTemplate";
import "../../globals.css";
import "katex/dist/katex.min.css";
import InfoBox from "@/src/components/infoBox";
import Latex from "react-latex-next";
import Link from "next/link";
import euler from "@/public/media/writing/exp-equivalence/euler.png";
import Image from "next/image";

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>
        The Many Faces of e<sup>x</sup>
      </h3>
      <h5>October 18, 2024</h5>
      <p>
        In precalculus, Euler&apos;s constant <Latex>$e$</Latex> is typically
        introduced in the context of compound interest, usually defined as
      </p>
      <Latex>{`$$e = \\lim_{n \\to \\infty} \\left(1 + \\frac1n\\right)^n$$`}</Latex>
      <p>
        which makes sense, but maybe feels a little unmotivated. Then in
        Calculus I, it gets defined as
      </p>
      <Latex>{`$$e^x = \\sum_{n=0}^\\infty \\frac{x^n}{n!}$$`}</Latex>
      <p>
        which is already confusing; what happened to{" "}
        <Latex>$e^x = e \times e \times \cdots \times e$</Latex>,{" "}
        <Latex>$x$</Latex> times? But then you reach your first differential
        equations course, where <Latex>$e^x$</Latex> is defined as the unique
        solution to
      </p>
      <Latex>$$y&apos; = y \\\\ y(0) = 1$$</Latex>
      <p>And of course, there&apos;s always Euler&apos;s formula</p>
      <Latex>{`$$e^{i\\theta} = \\cos\\theta + i\\sin\\theta$$`}</Latex>{" "}
      <p>
        leading to the crown jewel of math adorned on the T-shirts of math nerds
        everywhere, <Latex>{`$e^{i\\pi} = -1$`}</Latex>. What unifies these
        seemingly disparate representations?
      </p>
      <h4>Exponentials as Flow</h4>
      <p>
        We&apos;ll reach the true definition of the exponential in due time, but
        the most helpful stepping stone is its defining differential equation.
        As you may remember from your first ODEs course, the following system
      </p>
      <Latex>$$y&apos; = Ky$$</Latex>
      <p>
        has the solution <Latex>$y(t) = \exp(Kt)y(0)$</Latex> (remember,{" "}
        <Latex>$y$</Latex> can be a vector, in which case <Latex>$K$</Latex> is
        a matrix and <Latex>$\exp(Kt)$</Latex> is computed using the power
        series). It&apos;s easy to verify this algebraically, but let&apos;s
        take a moment to really understand what this system is telling us.
      </p>
      <ul className="list-disc ml-8">
        <li>
          <Latex>$y$</Latex> is a point in space, and this ODE tells us how{" "}
          <Latex>$y$</Latex> changes
        </li>
        <li>
          <Latex>$y&apos;$</Latex> tells us the direction <Latex>$y$</Latex>{" "}
          moves
        </li>
        <li>
          <Latex>$Ky$</Latex> points us in the direction <Latex>$K$</Latex>,
          relative to our current position <Latex>$y$</Latex>
        </li>
        <li>
          <Latex>$y&apos; = Ky$</Latex> means &quot;always move in the direction{" "}
          <Latex>$K$</Latex>, relative to your current position&quot;
        </li>
      </ul>
      <p>
        The &quot;relative to your current position&quot; part is crucial;
        let&apos;s review a classic example to understand what&apos;s happening
        here. Remember Euler&apos;s formula,{" "}
        <Latex>{`$e^{it} = \\cos(t) + i\\sin(t)$`}</Latex>? It tells us that{" "}
        <Latex>{`$e^{it}$`}</Latex> walks us around a circle for{" "}
        <Latex>$t$</Latex> seconds. Unsurprisingly, it&apos;s the solution to
        the differential equation
      </p>
      <Latex>$$y&apos; = iy \\ y(0) = 1$$</Latex>
      <p>
        Again, easy to check algebraically, but what&apos;s <Latex>$i$</Latex>{" "}
        doing there? Well, remember that <Latex>$i$</Latex> represents a 90&deg;
        rotation in the complex plane, which means our velocity is always
        rotated 90&deg; relative to our current position, i.e. it&apos;s
        tangential.
      </p>
      <div className="flex justify-center">
        <Image src={euler} alt="euler" className="w-1/3 min-w-[16rem] mb-6" />
      </div>
      <p>
        If you remember your physics classes, this diagram should look familiar.
        If your velocity is always rotated 90&deg; from your position, then you
        move in a circle. So if your velocity, <Latex>$y&apos;$</Latex>, is
        always a 90&deg; rotation of your position, <Latex>$iy$</Latex>, then of
        course you move in a circle!
      </p>
      <h4>The Lie Connection</h4>
      <p>
        More generally, what <Latex>$y&apos; = Ky$</Latex> means is that at any
        point <Latex>$y$</Latex> in space, the flow direction at that point is{" "}
        <Latex>$Ky$</Latex>. So if <Latex>$y(t) = \exp(Kt)y(0)$</Latex> is our
        solution, that means it must move us along the flow for{" "}
        <Latex>$t$</Latex> seconds. If we set <Latex>$t = 1$</Latex> and{" "}
        <Latex>$y(0) = 1$</Latex>, we can flip the definition around to give us{" "}
        <Latex>$\exp(K) = y(1)$</Latex>. A more complete definition is
      </p>
      <p className="mx-12 py-2 pl-4 border-l-2">
        Consider a path <Latex>$y(t)$</Latex> starting at the identity, so{" "}
        <Latex>$y(0) = 1$</Latex>. If the velocity at every point is{" "}
        <Latex>$Ky$</Latex>, then we define <Latex>$\exp(K) = y(1)$</Latex>.
        More generally, <Latex>$\exp(Kt) = y(t)$</Latex>.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>
      </p>
      <p>
        It may feel too abstract, but the abstraction lets us think about{" "}
        <Latex>$\exp$</Latex> in a much more general way. Returning to the{" "}
        <Latex>{`$e^{it}$`}</Latex> example, Euler&apos;s theorem almost becomes
        trivial: at every point <Latex>$y$</Latex>, the flow direction is{" "}
        <Latex>$iy$</Latex>, so <Latex>$\exp(it)$</Latex> walks us along the
        flow field for <Latex>$t$</Latex> seconds. The flow field is pointing in
        a circle, so we walk in a circle!
      </p>
      <p>
        We can use this definition to help demystify our previous definitions:
      </p>
      <ul className="list-disc ml-8">
        <li>
          We can think of compound interest as being a flow field on the number
          line. The amount of money you gain is proportional to the amount of
          money you have now, so if <Latex>$y$</Latex> is the money in your
          account, then <Latex>$y&apos; = Ky$</Latex>. <Latex>$\exp(1)$</Latex>{" "}
          is the amount of money you make after investing $1 and compounding for
          a year, since we followed the flow field for one year. No wonder{" "}
          <Latex>$e$</Latex> shows up!
        </li>
        <li>
          The power series{" "}
          <Latex>{`$\\sum_{n=0}^\\infty \\frac{x^n}{n!}$`}</Latex> is its own
          derivative (easy to check, just use the power rule), which means the
          flow field at <Latex>$y$</Latex> is just <Latex>$y$</Latex> itself.
          This matches the form prescribed in our definition, so we have that{" "}
          <Latex>{`$\\exp(x) = \\sum_{n=0}^\\infty \\frac{x^n}{n!}$`}</Latex>.
          <sup>
            <a id="footnote-2-ref" href="#footnote-2">
              [2]
            </a>
          </sup>
        </li>
      </ul>
      <p>But this new definition lets us do a whole lot more:</p>
      <ul className="list-disc ml-8">
        <li>
          Consider a velocity field <Latex>$u(x, t)$</Latex>. Then{" "}
          <Latex>$\exp$</Latex>, by definition, tells us where every point in
          space lands after moving along the velocity field for one second.
        </li>
        <li>
          A skew symmetric matrix, like{" "}
          <Latex>{`$\\footnotesize\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}$`}</Latex>
          , always represents a 90&deg; rotation. As we learned from our{" "}
          <Latex>{`$e^{it}$`}</Latex> example, following the flow field of a
          90&deg; rotation moves you in a circle, so <Latex>$\exp$</Latex> of a
          skew-symmetric matrix generates rotations.
        </li>
        <li>
          <Latex>{`$\\frac{\\mathrm d}{\\mathrm dt}$`}</Latex> doesn&apos;t seem
          like something you can exponentiate, but it&apos;s more than possible.
          Remember, <Latex>{`$\\frac{\\mathrm d}{\\mathrm dt}f$`}</Latex> gives
          us the velocity of <Latex>$f$</Latex>. So if <Latex>$\exp$</Latex>{" "}
          moves us along the flow field for one second, that means{" "}
          <Latex>{`$\\exp(\\frac{\\mathrm d}{\\mathrm dt})$`}</Latex> moves us
          along the velocity of <Latex>$f$</Latex> for one second. That just
          brings us to <Latex>$f$</Latex> one second in the future! In other
          words,{" "}
          <Latex>{`$\\exp(\\frac{\\mathrm d}{\\mathrm dt})f(t) = f(t + 1)$`}</Latex>
          . Thus, we derive the{" "}
          <Link href="https://en.wikipedia.org/wiki/Shift_operator">
            shift operator
          </Link>
          .
        </li>
      </ul>
      <p>
        So why&apos;s this section called The Lie Connection? Well, the
        definition of the exponential from earlier is typically formulated
        according to{" "}
        <Link href="https://en.wikipedia.org/wiki/Lie_theory">Lie Theory</Link>{" "}
        (pronounced &quot;Lee&quot;), explores integration of differential
        equations on smooth surfaces (manifolds). Lie theory is helpful for
        working with commonly used rotation groups such as{" "}
        <Latex>$SO(2)$</Latex>, <Latex>$SO(3)$</Latex>, and{" "}
        <Latex>$SU(2)$</Latex>, which are heavily used in optimization and
        robotics.
      </p>
      <p>
        If all this abstract exponentiation seems useless, I&apos;ll soon be
        uploading an article on how you can use it to numerically solve partial
        differential equations!
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          We don&apos;t actually need to define <Latex>$\exp(Kt)$</Latex> as{" "}
          <Latex>$y(t)$</Latex>, since it follows from the previous statements.
          Try proving it yourself! Hint: use the chain rule.{" "}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          There&apos;s a slightly caveat with the power series that often goes
          unaddressed. We want <Latex>$\exp(0)$</Latex> to be <Latex>$1$</Latex>
          , but evaluating the power series at <Latex>$0$</Latex>, we get{" "}
          <Latex>$\exp(0) = 0^0$</Latex>, which is undefined. The reason we
          leave <Latex>$0^0$</Latex> undefined is because the function{" "}
          <Latex>$x^y$</Latex> is discontinuous at <Latex>$(0, 0)$</Latex>:
          <Latex>{`$$\\lim_{x \\to 0} x^0 = 1 \\\\ \\lim_{y \\to 0} 0^y = 0$$`}</Latex>
          We can eliminate the ambiguity if we only care about continuity from
          one direction. Since the exponents are integers (so continuity
          doesn&apos;t matter), we can guarantee continuity in{" "}
          <Latex>$x$</Latex> by defining <Latex>$0^0 = 1$</Latex> for power
          series in general. <a href="#footnote-2-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
