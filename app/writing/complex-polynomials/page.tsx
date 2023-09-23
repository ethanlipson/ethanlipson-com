'use client';

import PageTemplate from '@/src/components/pageTemplate';
import Latex from 'react-latex-next';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Image from 'next/image';
import remainders from '@/public/media/writing/complex/remainders.png';

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
    <PageTemplate highlightWriting>
      <h3>Complex Numbers are Secretly Polynomials</h3>
      <h5>September 2, 2023</h5>
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
      <h4>The Naive Approach</h4>
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
        We get different answers, but different <i>how?</i> I&apos;ve written it
        a bit suggestively, but you might notice that the difference between the
        two results is <Latex>$x^2 + 1$</Latex>, the defining polynomial for{' '}
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
        x-squared-plus-one&quot;.) tells us to work within{' '}
        <Latex>$\mathbb R[x]$</Latex>, but to &quot;ignore&quot; the{' '}
        <Red>
          <Latex>$Q$</Latex>
        </Red>{' '}
        part -- if that sounds familiar, it&apos;s exactly what we did with
        division by 3 at the start of the article.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{' '}
        Specifically, it calls two polynomials the same if they differ only by a
        multiple of <Latex>$x^2 + 1$</Latex>. This lines up with our
        understanding of complex numbers: if <Latex>$z$</Latex> and{' '}
        <Latex>$w$</Latex> differ by a multiple of <Latex>$i^2 + 1$</Latex>, are
        they really different?
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
        that they all evaluate to the same thing. Technically, we&apos;d say{' '}
        <Latex>$\mathbb C$</Latex> and <Latex>$\mathbb R[x] / (x^2 + 1)$</Latex>{' '}
        are <i>isomorphic</i>, meaning they &quot;act the same&quot; with
        regards to addition and multiplication.
        <sup>
          <a id="footnote-2-ref" href="#footnote-2">
            [2]
          </a>
        </sup>
      </p>
      <h4>General Quotients</h4>
      <p>
        The fundamental idea here is that if we have a set of objects{' '}
        <Latex>$S$</Latex>, we can make a smaller version by considering some
        objects the same; in the case of{' '}
        <Latex>$\mathbb R[x] / (x^2 + 1)$</Latex>, <Latex>$S$</Latex> is the set
        of polynomials, and we consider two the same if they differ by a
        multiple of <Latex>$x^2 + 1$</Latex>.
      </p>
      <InfoBox title="Relations">
        <p>
          A <i>relation</i> is any rule you come up with that says if two
          objects are &quot;the same&quot;.
          <sup>
            <a id="footnote-3-ref" href="#footnote-3">
              [3]
            </a>
          </sup>{' '}
          For example, the relation for{' '}
          <Latex>$\mathbb R[x] / (x^2 + 1)$</Latex> is &quot;two polynomials are
          the same if they differ by a multiple of <Latex>$x^2 + 1$</Latex>
          &quot;.
        </p>
        <p>
          Relations are often denoted using the <Latex>$\sim$</Latex> symbol.
          Symbolically, we&apos;d say{' '}
          <Latex>
            {
              '$$f \\sim g \\Longleftrightarrow x^2 + 1\\ \\mathrm{divides}\\ (f - g)$$'
            }
          </Latex>
        </p>
      </InfoBox>
      <p>
        We can go much further than &quot;two objects are the same based on
        their difference&quot;. In fact, we can construct a quotient set from
        just about any relation you want. If you have a set <Latex>$S$</Latex>{' '}
        and a relation between objects <Latex>$\sim$</Latex>, you can begin
        reasoning about <Latex>$S/\!\sim$</Latex>.
      </p>
      <ol className="list-decimal flex flex-col gap-4 mx-8">
        <li>
          Consider <Latex>$\mathbb Z \times \mathbb Z$</Latex>, the set of all
          pairs of integers. If we apply the relation{' '}
          <Latex>$(a, b) \sim (c, d) \Longleftrightarrow ad = bc$</Latex>, then
          congratulations! You&apos;ve constructed{' '}
          <Latex>$(\mathbb Z \times \mathbb Z) / \! \sim$</Latex>, the set of
          fractions, also known as <Latex>$\mathbb Q$</Latex>.
          <sup>
            <a id="footnote-4-ref" href="#footnote-4">
              [4]
            </a>
          </sup>{' '}
          If it&apos;s unclear why, observe how you can cross-multiply two equal
          fractions and look at the formula you get.
        </li>
        <li>
          The integers mod 5, written <Latex>$\mathbb Z_5$</Latex>, can be
          constructed using the relation{' '}
          <Latex>
            {'$a \\sim b \\Longleftrightarrow 5\\ \\mathrm{divides}\\ (a - b)$'}
          </Latex>
          . Then, <Latex>$\mathbb Z_5$</Latex> is nothing but{' '}
          <Latex>$\mathbb Z / \! \sim$</Latex>. Think about why we can only have
          5 elements in this set!
        </li>
        <li>
          Consider <Latex>{'$\\mathbb R^{3 \\times 3}$'}</Latex> (the set of 3x3
          matrices) and the relation{' '}
          <Latex>$A \sim B \Longleftrightarrow \det A = \det B$</Latex>. Because
          we consider two matrices the same if they have the same determinant,
          each collection of &quot;equivalent&quot; matrices can be identified
          by its determinant. So,{' '}
          <Latex>{'$\\mathbb R^{3 \\times 3} / \\! \\sim$'}</Latex> behaves like{' '}
          <Latex>$\mathbb R$</Latex> under multiplication, since determinants
          multiply when multiplying matrices.
        </li>
      </ol>
      <p>
        Hopefully these examples have elucidated the convenience of quotient
        sets in mathematics. They&apos;re not always strictly necessary (you
        knew what a fraction was before reading this article), but they can
        allow us to construct complicated behavior by &quot;filtering down&quot;
        large, easy-to-describe objects.
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          In the language of{' '}
          <a href="https://en.wikipedia.org/wiki/Ring_theory">ring theory</a>,{' '}
          <Latex>$\mathbb R[x]$</Latex> is actually read &quot;R adjoin x&quot;,
          so the whole thing should be read &quot;R-adjoin-x mod
          x-squared-plus-one&quot;. <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          The term &quot;isomorphic&quot; comes from the Greek &quot;iso-&quot;
          meaning equal and &quot;morphe&quot; meaning shape, so understandably,
          we generally call two mathematical structures isomorphic if they have
          the same shape, i.e. behave the same. Specifically, this isomorphism
          would be a{' '}
          <a href="https://en.wikipedia.org/wiki/Ring_homomorphism">
            ring isomorphism
          </a>
          . <a href="#footnote-2-ref">&#8617;</a>
        </li>
        <li id="footnote-3">
          This should actually be called an{' '}
          <a href="https://en.wikipedia.org/wiki/Equivalence_relation">
            equivalence relation
          </a>
          . In general, a{' '}
          <a href="https://en.wikipedia.org/wiki/Binary_relation">relation</a>{' '}
          can really be anything we want, but equivalence relations have to
          follow three rules:{' '}
          <ul className="list-disc flex flex-col ml-8 my-4">
            <li>
              <a href="https://en.wikipedia.org/wiki/Reflexive_relation">
                Reflexivity
              </a>{' '}
              - For all <Latex>$x$</Latex>, <Latex>$x \sim x$</Latex>{' '}
            </li>
            <li>
              <a href="https://en.wikipedia.org/wiki/Symmetric_relation">
                Symmetry
              </a>{' '}
              - <Latex>$x \sim y$</Latex> implies <Latex>$y \sim x$</Latex>{' '}
            </li>
            <li>
              <a href="https://en.wikipedia.org/wiki/Transitive_relation">
                Transitivity
              </a>{' '}
              - <Latex>$x \sim y$</Latex> and <Latex>$y \sim z$</Latex> implies{' '}
              <Latex>$x \sim z$</Latex>
            </li>
          </ul>
          {`These rules are all pretty intuitive, so I felt that their omission
          was warranted :)`}{' '}
          <a href="#footnote-3-ref">&#8617;</a>
        </li>
        <li id="footnote-4">
          We also stipulate that <Latex>$b, d \neq 0$</Latex>, obviously.{' '}
          <a href="#footnote-4-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
