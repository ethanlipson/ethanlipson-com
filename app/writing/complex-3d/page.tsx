'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Latex from 'react-latex-next';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Where are the 3D complex numbers?</h3>
      <h5>September 23, 2023</h5>
      <p>
        It&apos;s a natural question. We learn about the number line in
        elementary school, and later we learn about the 2D complex plane. So
        what&apos;s next? <Latex>$a + bi + cj$</Latex>?
      </p>
      <h4>What Are We Asking?</h4>
      <p>
        If you stop to think, it might not be that obvious what we mean by
        &quot;3D complex numbers&quot;. What would they look like? How can we
        define 2D complex numbers in a way easily extensible to 3D?
      </p>
      <p>
        Our intuitive understanding of <Latex>$\mathbb C$</Latex> as a 2D plane
        lends itself to its description as a 2D vector space, like{' '}
        <Latex>$\mathbb R^2$</Latex>. You can&apos;t multiply vectors though, so
        we also give the complex numbers a product:
      </p>
      <Latex>
        $$\langle a, b\rangle \cdot \langle c, d\rangle = \langle ac - bd, ad +
        bc \rangle$$
      </Latex>
      <p>
        which you&apos;re probably familiar with -- if not, multiply out{' '}
        <Latex>$(a + bi)(c + di)$</Latex> and see what you get.
      </p>
      <p>
        So really, the complex numbers are just a vector space spanned by{' '}
        <Latex>{'$\\{1, i\\}$'}</Latex> and an additional multiplication
        operator (we call such an object an{' '}
        <a href="https://en.wikipedia.org/wiki/Algebra_over_a_field">algebra</a>
        ). Would the 3D complex numbers then be a vector space spanned by{' '}
        <Latex>{'$\\{1, i, j\\}$'}</Latex> with a special multiplication rule?
      </p>
      <p>
        Let&apos;s work out what such a multiplication rule would look like. We
        know how to multiply <Latex>$1 \cdot i$</Latex> and{' '}
        <Latex>$1 \cdot j$</Latex>, but what about <Latex>$ij$</Latex>? There
        are a few options, none of which work:
      </p>
      <ul className="list-disc flex flex-col gap-2 ml-8">
        <li>
          <Latex>{'$ij = i \\mathrm{,\\ so\\ } j = 1$'}</Latex>
        </li>
        <li>
          <Latex>{'$ij = j \\mathrm{,\\ so\\ } i = 1$'}</Latex>
        </li>
        <li>
          <Latex>{'$ij = -1 \\mathrm{,\\ so\\ } j = i$'}</Latex>
        </li>
        <li>
          <Latex>{'$ij = 1 \\mathrm{,\\ so\\ } j = -i$'}</Latex>
        </li>
      </ul>
      <p>
        In every case, we can&apos;t come up with a resonable value for{' '}
        <Latex>$ij$</Latex>. What we really have to do is create a fourth
        symbol, <Latex>$k$</Latex>, and set <Latex>$ij = k$</Latex> -- if
        you&apos;ve heard of the quaternions, that&apos;s what we&apos;re doing
        here.
      </p>
      <p>
        In fact, every time we want to add a new symbol, we have to define how
        it interacts with every other symbol before it. For instance, if we
        wanted to add <Latex>$\ell$</Latex> to{' '}
        <Latex>{'$\\{1, i, j, k\\}$'}</Latex>, we&apos;d have set values for{' '}
        <Latex>$1\ell$</Latex>, <Latex>$i\ell$</Latex>, <Latex>$j\ell$</Latex>,
        and <Latex>$k\ell$</Latex>. Generally, the number of symbols we need
        will double every time, so the next algebra after the quaternions is
        8-dimensional, then 16, then 32, etc. So the real answer to &quot;why
        aren&apos;t there 3D complex numbers?&quot; is &quot;3 isn&apos;t a
        power of 2&quot;.
      </p>
      <h4>What About the Cross Product?</h4>
      <p>
        You might be thinking &quot;ok, but the cross product exists. Why
        doesn&apos;t that count?&quot; And although the computer graphics part
        of me <i>loves</i> the cross product, I must admit that it fails on
        almost all fronts at being well-behaved. There are a few things we
        expect a product to do:
      </p>
      <ul className="list-disc flex flex-col gap-2 ml-8">
        <li>
          Commutativity: <Latex>$a \times b = b \times a$</Latex>
        </li>
        <li>
          Associativity:{' '}
          <Latex>$(a \times b) \times c = a \times (b \times c)$</Latex>
        </li>
        <li>
          Zero-product property: if <Latex>$a \times b = 0$</Latex>, then{' '}
          <Latex>$a = 0$</Latex> or <Latex>$b = 0$</Latex>.
        </li>
        <li>
          Bilinearity:{' '}
          <Latex>$k(a \times b) = ka \times b = a \times kb$</Latex>
        </li>
      </ul>
      <p>
        By this measure, the cross product is an abomination; it&apos;s not
        commutative, it&apos;s not associative, and it definitely doesn&apos;t
        have the zero-product property (in fact, anything squared is 0 under the
        cross product!). The only reason we call it a product at all is because
        it follows the bilinearity condition.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{' '}
      </p>
      <p>
        But how do we know there&apos;s really <i>nothing</i> there? Sure, we
        tried a couple options and they didn&apos;t work, but we didn&apos;t
        check every possible value for <Latex>$ij$</Latex>. Could there be
        something that works?
      </p>
      <p>
        Search all you want, but we actually know that there isn&apos;t. In
        1877, Ferdinand Georg Frobenius proved that the only algebras following
        the four rules listed earlier are <Latex>$\mathbb R$</Latex> and{' '}
        <Latex>$\mathbb C$</Latex>. If we drop the commutativity requirement, we
        also get the quaternions <Latex>$H$</Latex>, but that&apos;s it. Any
        other algebra will break one of those four rules.
      </p>
      <InfoBox title="Faulty Algebras">
        <p>
          The Frobenius theorem tells us that any algebra that&apos;s not{' '}
          <Latex>$\mathbb R$</Latex>, <Latex>$\mathbb C$</Latex>, or{' '}
          <Latex>$\mathbb H$</Latex> will break one of the rules. It&apos;s
          usually easy to enforce the first three, but getting the fourth to
          work is a challenge. See if you can find nonzero elements of these
          spaces that multiply to zero:
          <ol className="list-decimal flex flex-col gap-2 ml-8 my-4">
            <li>
              <Latex>$\mathbb R^2$</Latex> with{' '}
              <Latex>
                $\langle a, b\rangle \cdot \langle c, d\rangle = \langle ac,
                bd\rangle$
              </Latex>
            </li>
            <li>
              <Latex>$\mathbb C$</Latex> but with <Latex>$i^3 = -1$</Latex>{' '}
              instead
            </li>
            <li>
              <Latex>{'$\\mathbb R^{3 \\times 3}$'}</Latex> (3x3 matrices) with
              the usual matrix multiplication
            </li>
          </ol>
        </p>
      </InfoBox>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          Most things that feel &quot;product-y&quot; are actually just
          bilinear. If you stop and think, it&apos;s not that clear what the
          cross product, dot product, tensor product, and matrix product have in
          common; indeed, it&apos;s just that they&apos;re bilinear.{' '}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
