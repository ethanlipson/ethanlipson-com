'use client';

import PageTemplate from '@/src/components/pageTemplate';
import Latex from 'react-latex-next';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Image from 'next/image';
import remainders from '@/public/remainders.png';

interface Props {
  children: React.ReactNode;
}

const Red: React.FC<Props> = ({ children }: Props) => (
  <span className="text-red-500">{children}</span>
);

const Blue: React.FC<Props> = ({ children }: Props) => (
  <span className="text-blue-500">{children}</span>
);

export default function Writing() {
  return (
    <PageTemplate>
      <h3>Complex Numbers are Secretly Polynomials</h3>
      <h4>August 21, 2023</h4>
      <p>
        8 and 14 are equal, mod 3. They have the same remainder, so this should
        come as no surprise. Let&apos;s draw it out anyway.
      </p>
      <div className="flex justify-center">
        <Image src={remainders} alt="Remainders" className="w-2/3" />
      </div>
      <p>
        To observe the painstakingly obvious: each collection of dots can be
        split into the form{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>
        <Latex>$(3) + $</Latex>
        <Blue>
          <Latex>$R$</Latex>
        </Blue>
        , where{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        is the quotient and{' '}
        <Blue>
          <Latex>$R$</Latex>
        </Blue>{' '}
        is the remainder. If you ignore the{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        part, you see that 8 and 14 have the same value of{' '}
        <Blue>
          <Latex>$R$</Latex>
        </Blue>
        , <Latex>$2$</Latex>, so they&apos;re the same, mod 3. We call two
        numbers equal under this system if they differ only by a multiple of 3.
      </p>
      <p>
        What does this have to do with complex numbers or polynomials? All in
        due time.
      </p>
      <h4>***</h4>
      <p>
        If I were to ask you to give me a polynomial representation of a complex
        number, you&apos;d probably give me something like{' '}
      </p>
      <Latex>$$\varphi\!: a + bi \mapsto a + bx$$</Latex>
      <p>
        It&apos;s the first thing any reasonable person would come up with, and
        for good reason: <Latex>$\varphi(0) = 0$</Latex>,{' '}
        <Latex>$\varphi(1) = 1$</Latex>, and addition works the same in both
        spaces. But there&apos;s a glaring issue -- multiplication doesn&apos;t
        work. If we multiply out two of our polynomials, we get
      </p>
      <Latex>$$(a + bx)(c + dx)$$$$= ac + (ad + bc)x + (bd)x^2$$</Latex>
      <p>
        which doesn&apos;t fit into our paradigm (note the <Latex>$x^2$</Latex>
        ). Our problem here is that polynomials don&apos;t capture the{' '}
        <i>essence</i> of complex numbers -- nothing in <Latex>$a + bx$</Latex>{' '}
        screams <Latex>$i^2 = -1$</Latex>, because <Latex>$x$</Latex> is too
        generic a standin for <Latex>$i$</Latex>. Let&apos;s look at another
        example where polynomial multiplication goes wrong. Consider:
      </p>
      <Latex>$$(1 + i)(1 + i) = 2i$$ $$(1 + x)(1 + x) = 2x + x^2 + 1$$</Latex>
      <p>
        We get different answers, but different <i>how?</i>. I&apos;ve written
        it a bit suggestively, but you might notice that the difference between
        the two results is <Latex>$x^2 + 1$</Latex>, the defining polynomial for{' '}
        <Latex>$i$</Latex>. Coincidence? Let&apos;s try another.
      </p>
      <Latex>$$(3 + 4i)(10 + 2i)(7 - 3i)$$$$= 292 + 256i$$</Latex>
      <p>
        So we should get an answer of <Latex>$292 + 256i$</Latex>. This
        doesn&apos;t happen automatically in the polynomial case, but if we
        factor out the <Latex>$x^2 + 1$</Latex> term, we get
      </p>
      <Latex>
        $$(3 + 4x)(10 + 2x)(7 - 3x)$$$$= 210 + 232x - 82x^2 - 24x^3$$$$= (-24x -
        82)(x^2 + 1) + (292 + 256x)$$
      </Latex>
      <p>
        It looks like we get the answer we expect on the right but with this
        extra term on the left. At this point, it might become clear what&apos;s
        happening: if we substitute <Latex>$i$</Latex> for <Latex>$x$</Latex>{' '}
        like discussed earlier, the <Latex>$x^2 + 1$</Latex> vanishes and we get
        the answer we want. Every polynomial can be split into an{' '}
        <Latex>$x^2 + 1$</Latex> part and a remainder part,{' '}
        <span className="text-red-500">
          <Latex>$Q$</Latex>
        </span>
        <Latex>$(x^2 + 1)\ +\ $</Latex>
        <Blue>
          <Latex>$R$</Latex>
        </Blue>{' '}
        (in our case,{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        <Latex>$ = -24x - 82$</Latex> and{' '}
        <Blue>
          <Latex>$R$</Latex>
        </Blue>{' '}
        <Latex>$ = 292 + 256x$</Latex>), so we just ignore the{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        part. But that&apos;s not the end of the story -- to really understand
        what&apos;s going on, we need to talk about <i>quotient sets</i>.
      </p>
      <h4>Quotient Sets</h4>
      <InfoBox title="Polynomials">
        <p>
          Some quick terminology: <Latex>$\mathbb R[x]$</Latex> refers to the
          set of polynomials with real coefficients (sometimes called a{' '}
          <i>polynomial ring</i>). Members of <Latex>$\mathbb R[x]$</Latex>{' '}
          include <Latex>{'$0, 1, x^3 + 2, x^{100}$'}</Latex>, and anything else
          of that form. We don&apos;t include{' '}
          <Latex>$1 + x + x^2 + x^3 + \cdots$</Latex>, because it goes on
          forever.
        </p>
      </InfoBox>
      <p>
        As we saw earlier, <Latex>$\mathbb R[x]$</Latex> already almost behaves
        like <Latex>$\mathbb C$</Latex>, and it works perfectly if you treat{' '}
        <Latex>$x^2 + 1$</Latex> like <Latex>$0$</Latex>. So all we need to do
        is split the polynomial into{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        and{' '}
        <Blue>
          <Latex>$R$</Latex>
        </Blue>{' '}
        and just consider the{' '}
        <Blue>
          <Latex>$R$</Latex>
        </Blue>
        . How can we make this more precise?
      </p>
      <p>
        This is where quotient sets come in. The expression{' '}
        <Latex>$\mathbb R[x] / (x^2 + 1)$</Latex> (read &quot;R[x] mod
        x-squared-plus-one&quot; tells us work within{' '}
        <Latex>$\mathbb R[x]$</Latex>, but to &quot;ignore&quot; the{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        part -- if that sounds familiar, it&apos;s exactly what we did with
        division by 3 at the start of the article. Specifically, it calls two
        polynomials the same if they differ only by a multiple of{' '}
        <Latex>$x^2 + 1$</Latex>. This lines up with our understanding of
        complex numbers: if <Latex>$z$</Latex> and <Latex>$w$</Latex> differ by
        a multiple of <Latex>$i^2 + 1$</Latex>, are they really different?
      </p>
      <p>
        Just like we can talk about integers mod 3, we can talk about
        polynomials mod <Latex>$x^2 + 1$</Latex>. In the integers mod 3, we
        explicitly say that <Latex>$3 = 0$</Latex> and see what follows. In our
        quotient set, we explicitly say that <Latex>$x^2 + 1 = 0$</Latex> and
        see what follows. In both cases, the statement &quot;mod 3&quot; or
        &quot;mod <Latex>$x^2 + 1$</Latex>&quot; is just a reminder that
        we&apos;re ignoring some part of the expression by forcing it to be
        zero.
      </p>
      <p>
        Under this mapping, for example, the following polynomials would be
        equal
      </p>
      <Latex>$$1 + 2x$$$$2 + 2x + x^2$$$$2 + 6x + x^2 + 4x^3$$</Latex>
      <p>
        Since they all have the same remainder, mod <Latex>$x^2 + 1$</Latex>.
        Equivalently, if you plug in <Latex>$x = i$</Latex>, you&apos;ll see
        that they all evaluate to the same thing.
      </p>
    </PageTemplate>
  );
}
