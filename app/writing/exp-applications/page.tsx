"use client";

import PageTemplate from "@/src/components/pageTemplate";
import "../../globals.css";
import "katex/dist/katex.min.css";
import InfoBox from "@/src/components/infoBox";
import Latex from "react-latex-next";
import Link from "next/link";
import leftHalfPlane from "@/public/media/writing/exp-applications/left-half-plane.png";
import unitDisc from "@/public/media/writing/exp-applications/unit-disc.png";
import Image from "next/image";

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Exp Will Solve All Your Problems</h3>
      <h5>October 24, 2024</h5>
      <p>
        Towards the end of my{" "}
        <Link href="/writing/exp-equivalence">previous article</Link>, I made
        the wild claim that{" "}
        <Latex>{`$e^\\frac{\\mathrm d}{\\mathrm dt}f(t) = f(t + 1)$`}</Latex>,
        or in prose, that the exponential of the derivative operator is the
        shift operator. If you&apos;re interested in knowing why that&apos;s the
        case, I recommend giving it a read. But in short:
      </p>
      <p className="mx-12 py-2 pl-4 border-l-2">
        The differential equation <Latex>$y&apos; = Ky$</Latex>, which says
        &quot;at position <Latex>$y$</Latex>, move in the direction{" "}
        <Latex>$Ky$</Latex>
        &quot;, has the solution <Latex>{`$y(t) = e^{Kt}y(0)$`}</Latex>. So{" "}
        <Latex>{`$e^\\frac{\\mathrm d}{\\mathrm dt}f(t)$`}</Latex> tells us
        &quot;starting at <Latex>$f(t)$</Latex>, move in the direction{" "}
        <Latex>{`$\\frac{\\mathrm df}{\\mathrm dt}$`}</Latex> for one
        second&quot;, thus landing us at <Latex>$f(t + 1)$</Latex>.
      </p>
      <p>
        More generally, we have that{" "}
        <Latex>{`$e^{a\\frac{\\mathrm d}{\\mathrm dt}} = T^a$`}</Latex>, where{" "}
        <Latex>$T^a$</Latex> shifts a function over by <Latex>$a$</Latex> units.
        All of this can be verified using Taylor series, as demonstrated{" "}
        <Link href="/media/writing/exp-applications/exp-of-derivative-is-shift.pdf">
          here
        </Link>
        , although I personally don&apos;t find such an algebraic proof
        convincing. Instead, I think both you and I would prefer to see the
        applications of this identity. And surprisingly, they&apos;re quite
        plentiful. In this article, we&apos;ll explore applications in
      </p>
      <ol className="list-decimal ml-8">
        <li>Dynamical systems</li>
        <li>Fourier analysis</li>
        <li>Partial differential equations</li>
      </ol>
      <p>which, hopefully, you&apos;ll find convincing enough!</p>
      <h4>1. Dynamical Systems</h4>
      <p>
        Any dynamical systems course will cover linear dynamical systems, which
        come in two flavors: continuous and discrete. Continuous linear systems
        have the form
      </p>
      <Latex>{`$$\\frac{\\mathrm d}{\\mathrm dt}y = Ky$$`}</Latex>
      <p>
        for <Latex>$y \in \mathbb R^n$</Latex> and a square matrix{" "}
        <Latex>{`$K \\in \\mathbb R^{n \\times n}$`}</Latex>, whereas discrete
        linear systems have the form
      </p>
      <Latex>$$y(t + 1) = My(t)$$</Latex>
      <p>
        for a similar vector <Latex>$y$</Latex> and matrix <Latex>$M$</Latex>.
        It would seem that these two types of systems have something in common,
        but it&apos;s hard to say exactly how they&apos;re related. But if we
        turn to the exponential, all becomes clear. In the continuous case, our
        system is telling us that{" "}
        <Latex>{`$\\frac{\\mathrm d}{\\mathrm dt}$`}</Latex> and{" "}
        <Latex>$K$</Latex> do the same thing to <Latex>$y$</Latex>, so it stands
        to reason that <Latex>{`$e^\\frac{\\mathrm d}{\\mathrm dt}$`}</Latex>{" "}
        and <Latex>$e^K$</Latex> would also do the same thing to{" "}
        <Latex>$y$</Latex>, that is,
      </p>
      <Latex>{`$$e^\\frac{\\mathrm d}{\\mathrm dt}y = e^Ky$$`}</Latex>
      <p>
        But we already know what{" "}
        <Latex>{`$e^\\frac{\\mathrm d}{\\mathrm dt}$`}</Latex> does: it&apos;s
        the shift operator! So we can rewrite the above equation as
      </p>
      <Latex>$$y(t + 1) = e^Ky(t)$$</Latex>
      <p>
        and if we let <Latex>$M = e^K$</Latex>, we get the exact form of a
        discrete system. Like magic, the exponential has turned a continuous
        object into a discrete one.
      </p>
      <p>
        But there&apos;s more! After introducing linear dynamical systems,
        stability conditions are usually discussed. For continuous linear
        systems, a system is stable only if the eigenvalues of{" "}
        <Latex>$K$</Latex> all have a negative real part. For discrete linear
        systems, they&apos;re only stable if the eigenvalues have a magnitude
        less than <Latex>$1$</Latex>.
      </p>
      <div className="flex items-center gap-8 flex-col">
        <Image
          src={leftHalfPlane}
          alt="Left Half Plane"
          className="w-2/3 min-w-[16rem]"
        />
        <Image src={unitDisc} alt="Unit Disc" className="w-2/3 min-w-[16rem]" />
      </div>
      <p>
        It&apos;s common for students to be frustrated by these seemingly
        unrelated conditions, but our exponential analysis reveals the
        connection: if a complex number <Latex>$z$</Latex> has a negative real
        part, then the magnitude of <Latex>$e^z$</Latex> is less than one. In
        other words, the exponential of the left half-plane is the unit disc.
        When we used the exponential to go from continuous to discrete, we
        brought the eigenvalues along with us!
      </p>
      <p>
        More generally, <Latex>$\exp$</Latex> brings us from the continuous
        world to the discrete world.{" "}
        <Latex>{`$\\frac{\\mathrm d}{\\mathrm dt}f$`}</Latex> tells us how to
        move &quot;a little bit&quot;, while <Latex>$Tf$</Latex> tells us how to
        move a discrete amount of time. It&apos;s a lot like integration in that
        respect.
      </p>
      <h4>2. Fourier Analysis</h4>
      <InfoBox title="The Fourier Transform">
        <p>
          The Fourier transform <Latex>$\hat f$</Latex> of a function{" "}
          <Latex>$f$</Latex>, defined as
        </p>
        <Latex>{`$$\\hat f(\\omega) = \\int_{-\\infty}^\\infty e^{i\\omega t}f(t)dt$$`}</Latex>
        <p>
          tells us how to represent a function as a sum/integral of complex
          exponentials. <Latex>$\hat f(\omega)$</Latex> tells us how strongly
          the frequency <Latex>$\omega$</Latex> contributes to{" "}
          <Latex>$f$</Latex>.{" "}
        </p>
      </InfoBox>
      <p>
        These exponentials are &quot;eigenfunctions&quot; of differentiation,
        that is, they simply get scaled when you differentiate them.
      </p>
      <Latex>{`$$\\frac{\\mathrm d}{\\mathrm dt}e^{i\\omega t} = i\\omega e^{i\\omega t}$$`}</Latex>
      <p>
        so it&apos;s no surprise that the Fourier transform, as a linear
        combination of exponentials, acts like an eigenfunction as well.
      </p>
      <Latex>{`$$\\widehat{f'}(\\omega) = i\\omega\\hat f(\\omega)$$`}</Latex>
      <p>
        This property has many names, but we&apos;ll call it the{" "}
        <i>differentiation property</i> of the Fourier transform. The
        differentiation property is so easy to prove that it&apos;s rarely
        called a theorem, instead just a basic fact about the transform. But
        there&apos;s another slightly more subtle result called the{" "}
        <i>shift theorem</i>:
      </p>
      <Latex>{`$$\\widehat{T^af}(\\omega) = e^{i\\omega a}\\hat f(\\omega)$$`}</Latex>
      <p>
        which says that the Fourier transform a function shifted by{" "}
        <Latex>$a$</Latex> units is the same as multiplying by{" "}
        <Latex>{`$e^{i\\omega a}$`}</Latex>. If you&apos;re comfortable with
        Fourier analysis, this should be intuitive, since{" "}
        <Latex>{`$e^{i\\omega a}$`}</Latex> represents a phase shift by{" "}
        <Latex>$a$</Latex> at frequency <Latex>$\omega$</Latex>. But of course,
        there&apos;s another way to view this; let&apos;s take another look at
        the differentiation property. Essentially, it tells us that, at a given
        frequency <Latex>$\omega$</Latex>, differentiating is the same as
        multiplying by <Latex>$i\omega$</Latex>. So, like last time, it stands
        to reason that{" "}
        <Latex>{`$e^{a\\frac{\\mathrm d}{\\mathrm dt}} = e^{i\\omega a}$`}</Latex>
        , i.e. <Latex>{`$T^a = e^{i\\omega a}$`}</Latex>. With respect to the
        Fourier transform, the shift <Latex>$T^a$</Latex> and the exponential{" "}
        <Latex>{`$e^{i\\omega a}$`}</Latex> are exactly the same operation.
      </p>
      <h4>3. Partial Differential Equations</h4>
      <p>
        But maybe even the previous material isn&apos;t applied enough for you.
        You want to see some numerical, scientific computing done with{" "}
        <Latex>{`$e^\\frac{\\mathrm d}{\\mathrm dt}$`}</Latex>. In that case,
        you&apos;re probably familiar with the discrete derivative matrix, but
        let&apos;s review it anyway!
      </p>
      <p>
        Suppose you have a function <Latex>$u$</Latex> sampled at{" "}
        <Latex>$u_0, u_1, u_2$</Latex> (we write <Latex>$u_x = u(x)$</Latex> to
        ease notation), and we want to approximate the derivative at{" "}
        <Latex>$u_1$</Latex>. Is there a &quot;best&quot; way to do this? As it
        turns out, yes! <Latex>{`$\\frac{u_2 - u_0}2$`}</Latex> gives us the
        best answer for the derivative at <Latex>$u_1$</Latex>. Try it on a line
        and see what you get. If we instead have a vector of samples
      </p>
      <Latex>{`$$
        u = \\begin{pmatrix}u_0 \\\\ u_1 \\\\ u_2 \\\\ \\vdots \\\\ u_N\\end{pmatrix}
      $$`}</Latex>
      <p>
        we can compress our so-called &quot;discrete derivative&quot; into a
        matrix <Latex>$D$</Latex>
      </p>
      <Latex>{`$$
        D = \\begin{pmatrix} \\frac12 & 0 & 0 & 0 & \\\\ 0 & \\frac12 & 0 & 0 & \\\\ -\\frac12 & 0 & \\frac12 & 0 & \\cdots \\\\ 0 & -\\frac12 & 0 & \\frac12 & \\\\ & & \\vdots & & \\ddots \\end{pmatrix}
      $$`}</Latex>
      <p>
        so that, as we hope, <Latex>$Du$</Latex> gives us our estimated values
        for <Latex>$u&apos;(x)$</Latex>
      </p>
      <Latex>{`$$
        Du = \\begin{pmatrix}u'_0 \\\\ u'_1 \\\\ u'_2 \\\\ \\vdots \\\\ u'_N\\end{pmatrix}
      $$`}</Latex>
      <p>
        We should expect that the derivative can be encapsulated by a matrix,
        since it&apos;s a linear operator and all finite-dimensional linear
        operators can be represented by matrices.
      </p>
      <p>
        Now, onto the PDEs! The first PDE you study in depth is typically the 1D{" "}
        <i>heat equation</i>
      </p>
      <Latex>{`$$\\frac{\\mathrm d}{\\mathrm dt}u = \\frac{\\mathrm d^2}{\\mathrm dx^2}u$$`}</Latex>
      <p>
        where <Latex>$u(x, t)$</Latex> tells us the temperature at position{" "}
        <Latex>$x$</Latex> at time <Latex>$t$</Latex>. When we&apos;re solving
        this computationally, we usually have a starting vector{" "}
        <Latex>$u(x, 0)$</Latex> of temperatures, and we use the heat equation
        to advance it in time. At this point in the article, you&apos;re
        probably already thinking what I&apos;m thinking: if we view the
        equation as
      </p>
      <Latex>{`$$\\frac{\\mathrm d}{\\mathrm dt}u = D^2u$$`}</Latex>
      <p>
        then we transform it into a first order linear ODE, which has the exact
        solution
      </p>
      <Latex>{`$$u(x, t) = e^{D^2t}u(x, 0)$$`}</Latex>
      <p>
        And we&apos;ve done it again, we&apos;ve exponentiated the derivative
        operator! Except now that we&apos;ve discretized it, we can get
        numerical results. Here&apos;s what the evolution looks like, starting
        with randomly initialized data.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>
      </p>
      <div className="flex justify-center">
        <video controls className="w-2/3 min-w-[18rem]">
          <source
            src="/media/writing/exp-applications/heat-evolution.mp4"
            type="video/mp4"
          />
        </video>
      </div>
      <p>
        The code for the above simulation is available{" "}
        <Link href="https://github.com/ethanlipson/exponential-partial-diff-eqs/blob/main/heat-eq.py">
          here
        </Link>
        . Heat simulations exist already, but what&apos;s fascinating here is
        that this exponential method gives a formula for seeing any point in the
        future. Most simulations require you to slowly advance time to the point
        you&apos;re interested in. With this method, if we want to know how the
        simulation looks in exactly 85 seconds, we can see it with one
        computation.
      </p>
      <p>
        We can easily do the same thing with the wave equation, which has the
        form
      </p>
      <Latex>{`$$\\frac{\\mathrm d^2}{\\mathrm dt^2}u = \\frac{\\mathrm d^2}{\\mathrm dx^2}u$$`}</Latex>
      <p>
        Since the time derivative is second-order, we&apos;ll need to transform
        this into a first-order equation, which is pretty straightforward.
        Simply let <Latex>{`$v = \\frac{\\mathrm du}{\\mathrm dt}$`}</Latex>, so
        we have
      </p>
      <Latex>{`$$\\frac{\\mathrm d}{\\mathrm dt}\\begin{pmatrix}u \\\\ v\\end{pmatrix} = \\begin{pmatrix}0 & I \\\\ D^2 & 0\\end{pmatrix}\\begin{pmatrix}u \\\\ v\\end{pmatrix}$$`}</Latex>
      <p>
        Note that we&apos;ve replaced{" "}
        <Latex>{`$\\frac{\\mathrm d^2}{\\mathrm dx^2}$`}</Latex> with{" "}
        <Latex>$D^2$</Latex> like last time. This gives us the explicit solution
      </p>
      <Latex>{`$$\\begin{pmatrix}u(x, t) \\\\ v(x, t)\\end{pmatrix} = \\exp\\begin{pmatrix}0 & It \\\\ D^2t & 0\\end{pmatrix}\\begin{pmatrix}u(x, 0) \\\\ v(x, 0)\\end{pmatrix}$$`}</Latex>
      <p>Here&apos;s a visualization:</p>
      <div className="flex justify-center">
        <video controls className="w-2/3 min-w-[18rem]">
          <source
            src="/media/writing/exp-applications/wave-evolution.mp4"
            type="video/mp4"
          />
        </video>
      </div>
      <p>
        The code for the above simulation is available{" "}
        <Link href="https://github.com/ethanlipson/exponential-partial-diff-eqs/blob/main/wave-eq.py">
          here
        </Link>
        . This method also has the advantage of being completely timestep
        invariant. Most simulations lose accuracy if you advance time too
        quickly, but this one remains perfectly accurate. It&apos;s exciting
        what exponentials can do for us!
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          This simulation has periodic boundary conditions, which is captured by
          the fact that the entries of <Latex>$D$</Latex> wrap around at the
          edges. You can use the forward- and backward-difference formulas if
          you want different boundary conditions.{" "}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
