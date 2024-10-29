"use client";

import PageTemplate from "@/src/components/pageTemplate";
import "../../globals.css";
import "katex/dist/katex.min.css";
import InfoBox from "@/src/components/infoBox";
import Latex from "react-latex-next";
import Link from "next/link";
import plot from "@/public/media/writing/log-derivative/plot.png";
import Image from "next/image";

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Why is Log the Antiderivative of 1/x?</h3>
      <h5>October 30, 2024</h5>
      <p>
        The power rule has a weird deficiency that everyone just learns to deal
        with. Recall, the power rule tells us that the antiderivative of{" "}
        <Latex>$x^p$</Latex> is
      </p>
      <Latex>{`$$\\frac{x^{p+1}}{p+1}$$`}</Latex>
      <p>
        which gives us our familiar relations: the antiderivative of{" "}
        <Latex>$x$</Latex> is <Latex>$\frac12x^2$</Latex>, the antiderivative of{" "}
        <Latex>$0$</Latex> is a constant, and the antiderivative of{" "}
        <Latex>{`$x^{-1}$`}</Latex> is... <Latex>$\log x$</Latex>? What?! This
        logarithm just seems to come out of nowhere. It&apos;s easy to
        algebraically prove why this happens, but it still feels weird. Most
        students end up treating this as a rule to be memorized, but it&apos;s
        not hard to see why this happens.
      </p>
      <h4>Log as a Limit</h4>
      <p>
        (To be clear, the proof of the derivative of <Latex>$\log$</Latex> is
        quite simple.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{" "}
        My goal here is to bring a more intuitive understanding to the table.)
      </p>
      <p>
        As with most edge cases/singularities in math, they can be better
        understood as a limit of local behavior. In this case, we can view the
        antiderivative of <Latex>{`$x^{-1}$`}</Latex> as the limit of the
        antiderivatives of <Latex>{`$x^{-1.1}$`}</Latex>,{" "}
        <Latex>{`$x^{-1.01}$`}</Latex>, <Latex>{`$x^{-1.001}$`}</Latex>, and so
        on. That is, we should expect
      </p>
      <Latex>{`$$\\int x^{-1}\\mathrm dx = \\lim_{p \\to -1} \\int x^p\\mathrm dx$$`}</Latex>
      <p>
        Note that we need to pay special attention to the bounds of integration
        here. If we start the integral of <Latex>{`$x^{-1}$`}</Latex> from{" "}
        <Latex>$x = 0$</Latex>, it diverges, so we need to start from{" "}
        <Latex>$x = 1$</Latex> instead. Thus, for any positive input{" "}
        <Latex>$a$</Latex>, we want
      </p>
      <Latex>{`$$\\int_1^a x^{-1}\\mathrm dx = \\lim_{p \\to -1} \\int_1^a x^p\\mathrm dx$$`}</Latex>
      <p>The expression on the right becomes</p>
      <Latex>{`$$\\lim_{p \\to -1} \\frac{a^{p+1} - 1}{p+1}$$`}</Latex>
      <p>which, on a graph, actually looks pretty close to a logarithm!</p>
      <div className="flex justify-center">
        <Image src={plot} alt="plot" className="w-2/3 min-w-[20rem]" />
      </div>
      <p>
        So it would appear that our intuition is correct, and the local limiting
        behavior is as we expect. Can we do any better? Well, the next step
        would be to show that the above expression actually approaches a
        logarithm, i.e.
      </p>
      <Latex>{`$$\\lim_{p \\to -1} \\frac{a^{p+1} - 1}{p+1} = \\log(a)$$`}</Latex>
      <p>which can be rewritten as</p>
      <Latex>{`$$\\lim_{p \\to 0} \\frac{a^p - 1}p = \\log(a)$$`}</Latex>
      <p>
        Occasionally, this limit is used as a definition of{" "}
        <Latex>$\log$</Latex> itself! But there&apos;s actually a very simple
        explanation. Remember that <Latex>$\log a$</Latex> is the inverse of{" "}
        <Latex>$e^a$</Latex>, which is defined as
      </p>
      <Latex>{`$$\\lim_{n \\to \\infty} \\left(1+\\frac an\\right)^n$$`}</Latex>
      <p>
        (Remember back to your introduction to <Latex>$e$</Latex> as compound
        interest!) If we make the substitution <Latex>$p = \frac1n$</Latex>, the
        above expression becomes
      </p>
      <Latex>{`$$\\lim_{p \\to \\infty} \\left(1+ap\\right)^{\\frac1p}$$`}</Latex>
      <p>
        Now, just as the defining relationship between <Latex>$e^a$</Latex> and{" "}
        <Latex>$\log$</Latex> is <Latex>$\log e^a = a$</Latex>, we can do the
        same for their limiting expressions:
      </p>
      <Latex>{`$$\\lim_{p \\to \\infty} \\left(1 + \\frac{a^p - 1}pp\\right)^{\\frac1p} \\\\ = \\lim_{p \\to \\infty} \\left(1 + a^p - 1\\right)^{\\frac1p} \\\\ = \\lim_{p \\to \\infty} \\left(a^p\\right)^{\\frac1p} \\\\ = a$$`}</Latex>
      <p>
        and as you can check for yourself, the same applies the other way
        around, just like <Latex>{`$e^{\\log a}$`}</Latex>. So it&apos;s not a
        surprise that{" "}
        <Latex>{`$\\lim_{p \\to 0} \\frac{a^p - 1}p = \\log(a)$`}</Latex>.
      </p>
      <p>
        Another way to view the logarithm here is in terms of growth rate.{" "}
        <Latex>$\log x$</Latex> is a <i>subpolynomial function</i>, which means
        that it grows slower than any polynomial. This is what we should expect
        from the power rule: we want the antiderivative of{" "}
        <Latex>{`$x^{-1}$`}</Latex> to look something like <Latex>$x^0$</Latex>,
        which would also be subpolynomial (since it&apos;s a constant). And
        although we don&apos;t quite get that answer, its subpolynomial nature
        is echoed in the logarithm.
      </p>
      <p>
        Similarly, note that <Latex>$e^x$</Latex> is <i>superpolynomial</i>,
        i.e. it grows faster than any polynomial. And just like how the inverse
        of <Latex>$x^p$</Latex> is <Latex>{`$x^\\frac1p$`}</Latex>, we have that
        the inverse <Latex>$\log x$</Latex> is <Latex>$e^x$</Latex>, or the
        inverse of a subpolynomial is a superpolynomial. Or, less precisely, the
        inverse of <Latex>$x^0$</Latex> is{" "}
        <Latex>{`$x^{\\frac10} = x^\\infty$`}</Latex>, larger than any
        polynomial!
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          Take <Latex>$y = \log x$</Latex>, so <Latex>$x = e^y$</Latex>.
          Differentiating both sides with respect to <Latex>$x$</Latex>, we get{" "}
          <Latex>$1 = e^yy&apos;$</Latex>, and therefore{" "}
          <Latex>{`$y' = \\frac1{e^y} = \\frac1x$`}</Latex>.{" "}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
