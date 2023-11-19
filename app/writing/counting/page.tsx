'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Latex from 'react-latex-next';
import rubiksCube from '@/public/media/writing/counting/rubiks-cube.png';
import cube1 from '@/public/media/writing/counting/cube1.png';
import cube2 from '@/public/media/writing/counting/cube2.png';
import cube3 from '@/public/media/writing/counting/cube3.png';
import Image from 'next/image';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>How to Count</h3>
      <h5>November 19, 2023</h5>
      <p>
        In the map of mathematics, combinatorics (the study of counting) is a
        continent. Counting is fundamental to everything we do, so it&apos;s not
        a shock that it would occupy such a prominent spot in the collective
        consciousness of mathematicians.
      </p>
      <p>
        You might think counting is easy; indeed, we learn to count from a young
        age. But counting the number of possible configurations of a
        Rubik&apos;s Cube, for example, is anything but easy. In such a
        scenario, the combinatorist&apos;s primary tool is <i>symmetry</i>.
      </p>
      <div className="flex justify-center">
        <Image
          src={rubiksCube}
          alt="Rubik's Cube"
          className="w-2/3 min-w-[18rem]"
        />
      </div>
      <p>
        Consider how multiple different configurations of a Rubik&apos;s Cube
        are the same when you spin the cube around -- how we handle these
        symmetric arrangements has everything to do with counting problems.
      </p>
      <h4>Groups and Symmetry</h4>
      <p>
        You <i>do not</i> need to know anything about groups to understand this
        article. Everything you need to know is in this box.
      </p>
      <InfoBox title="Groups">
        <p>
          A group is a collection of (typically abstract) objects and some way
          of combining them. For example, consider the set of all ways to rotate
          a cube:
          <ul className="list-disc flex flex-col gap-2 ml-8 my-4">
            <li>Combining two rotations gives you another rotation</li>
            <li>
              We consider rotating by 0 degrees, i.e. doing nothing, as a
              rotation (the identity rotation)
            </li>
          </ul>
          It turns out that groups are excellent at modeling symmetry. We will
          make great use of this fact.
        </p>
      </InfoBox>
      <p>
        It&apos;s always helpful to give names, so let&apos;s call the rotations
        of a cube <Latex>$R$</Latex>, and let <Latex>$r$</Latex> be a 90°
        rotation, so <Latex>$r \in R$</Latex> (the <Latex>$\in$</Latex> symbol
        means &quot;is contained in&quot;). Then, we use the{' '}
        <Latex>$\times$</Latex> to apply the rotation <Latex>$r$</Latex> to the
        cube.
      </p>
      <div className="flex justify-center">
        <Image
          src={cube1}
          alt="90 degree rotation"
          className="w-2/3 min-w-[18rem]"
        />
      </div>
      <p>
        Importantly, observe that <Latex>$r$</Latex> takes us from one coloring
        of the cube to a different coloring (we care about orientation, so red
        in front vs. blue in front matters). We need to make the distinction
        between <i>rotations of the cube</i> and the cube colorings themselves;
        continuing to name things, we&apos;ll call <Latex>$X$</Latex> the set of
        cube colorings, and <Latex>$R$</Latex> the set of rotations as before.
        Convince yourself that, if we have <Latex>$n$</Latex> colors, there are{' '}
        <Latex>$n^6$</Latex> colorings in <Latex>$X$</Latex>.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{' '}
      </p>
      <p>
        In the above diagram, we have two colorings <Latex>$a$</Latex> and{' '}
        <Latex>$b$</Latex>, related by the equation{' '}
        <Latex>$r \times a = b$</Latex>. In particular, we have
      </p>
      <ol className="list-decimal flex flex-col gap-2 ml-8">
        <li>
          <Latex>$r \in R$</Latex> and <Latex>$a, b \in X$</Latex>.
        </li>
        <li>
          <Latex>$\times$</Latex> eats an <Latex>$R$</Latex> and an{' '}
          <Latex>$X$</Latex>, and spits out an <Latex>$X$</Latex>, in the form{' '}
          <Latex>$R \times X = X$</Latex>.
        </li>
      </ol>
      <p>
        Obviously, if you have a cube that&apos;s all red, rotating it around
        isn&apos;t gonna change the coloring. But it gets more complicated: for
        example, a cube that&apos;s green on the top and bottom, and yellow on
        the sides. Rotating up or down changes the coloring, but left and right
        doesn&apos;t.
      </p>
      <div className="flex justify-center">
        <Image
          src={cube2}
          alt="Horizontal rotation invariance"
          className="w-2/3 min-w-[18rem]"
        />
      </div>
      <p>
        Algebraically, we&apos;d write this as <Latex>$r \times x = x$</Latex>,
        and we&apos;d say that <Latex>$r$</Latex> <i>fixes</i>{' '}
        <Latex>$x$</Latex>, or that <Latex>$x$</Latex> is a <i>fixed point</i>{' '}
        of <Latex>$r$</Latex>.
      </p>
      <h4>Orbits and Stabilizers</h4>
      <p>
        Let&apos;s flesh out this idea of fixed points. If we call the
        green-and-yellow cube from before <Latex>$x$</Latex>, it might be
        helpful to think about which rotations fix <Latex>$x$</Latex>. Counting
        them, there are 8 total (identity, spinning around, flipping). We call
        this collection of &quot;fixing&quot; rotations the <i>stabilizer</i> of{' '}
        <Latex>$x$</Latex>, or <Latex>$R_x$</Latex>, or just{' '}
        <Latex>{'$\\mathrm{Stab}(x)$'}</Latex> (I&apos;m partial to the latter
        for readability).
      </p>
      <p>
        What about everything else not in the stabilizer? Well, there are two
        other colorings that we could rotate <Latex>$x$</Latex> to; we call this
        collection of &quot;neighbor&quot; colorings the <i>orbit</i> of{' '}
        <Latex>$x$</Latex>, or <Latex>$G \times x$</Latex>, or just{' '}
        <Latex>{'$\\mathrm{Orb}(x)$'}</Latex> (I&apos;m partial to the latter,
        orb is a cool word). In this case, the orbit of <Latex>$x$</Latex> has
        three elements:
      </p>
      <div className="flex justify-center">
        <Image src={cube3} alt="Orbit of x" className="w-2/3 min-w-[18rem]" />
      </div>
      <p>
        In general, orbit and stabilizer are inversely proportional; when
        stabilizer is big, orbit is small, and when stabilizer is small, orbit
        is big. Let&apos;s work through a couple examples.
      </p>
      <ol className="list-decimal flex flex-col gap-2 ml-8">
        <li>
          <p>
            Consider a cube that&apos;s all red. Every rotation gives you the
            same coloring, so the stabilizer is all of <Latex>$R$</Latex>.
            However, we&apos;re not able to get to any other colorings, so the
            orbit is just the cube itself.
          </p>
        </li>
        <li>
          <p>
            Consider a cube that&apos;s different colors on all six sides. Every
            rotation changes the coloring, so the stabilizer is just the
            identity rotation. For the same reason, the orbit has one coloring
            for each rotation, so it&apos;s much larger.
          </p>
        </li>
      </ol>
      <p>
        The <i>orbit-stabilizer theorem</i> tells us that orbit and stabilizer
        vary inversely to each other.
        <sup>
          <a id="footnote-2-ref" href="#footnote-2">
            [2]
          </a>
        </sup>{' '}
        This should be intuitive: if lots of rotations fix your coloring, then
        they can&apos;t bring you to many new ones. Inversely, if your rotations
        generally don&apos;t keep you at the same coloring, they must bring you
        to lots of new ones.
      </p>
      <h4>Burnside&apos;s Lemma</h4>
      <p>
        This is the crown jewel. The usual formula looks like a bunch of
        notation, so I&apos;ll write it out in English:
      </p>
      <Latex>
        {
          '$$(\\mathrm{\\#\\ of\\ orbits}) = \\frac{\\sum_{r \\in R} (\\mathrm{\\#\\ colorings\\ fixed\\ by\\ } r)}{|R|}$$'
        }
      </Latex>
      <p>In other words,</p>
      <Latex>
        {
          '$$(\\mathrm{\\#\\ of\\ orbits}) = (\\mathrm{avg\\ stabilizer\\ size})$$'
        }
      </Latex>
      <p>
        There&apos;s a lot going on here, but the underlying reasoning is pretty
        simple. If the size of stabilizers is large, then the size of orbits
        must be small (by the orbit-stabilizer theorem). If the orbits are
        small, there must be many of them, since each coloring is in some orbit.
        So large stabilizers equals many orbits.
        <sup>
          <a id="footnote-3-ref" href="#footnote-3">
            [3]
          </a>
        </sup>{' '}
      </p>
      <p>
        The upshot is that we can use this formula to count orbits while only
        thinking about stabilizers. For example, say I want to count the number
        of colorings of the cube <i>up to rotation</i>, which if you think about
        it, is just asking how many orbits there are. This is normally a hard
        problem, but Burnside&apos;s Lemma lets us do it by counting fixed
        points, which is way easier.
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          For each face we have <Latex>$n$</Latex> colors to choose from, i.e.
          there are <Latex>$n$</Latex> ways to do it. Since there are six faces,
          there are <Latex>$n \times \cdots \times n = n^6$</Latex> ways color
          the cube. <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          It actually makes a stronger statement. For any{' '}
          <Latex>$x \in X$</Latex>, we have{' '}
          <Latex>{'$|\\mathrm{Orb}(x)||\\mathrm{Stab}(x)| = |R|$'}</Latex>.{' '}
          <a href="#footnote-2-ref">&#8617;</a>
        </li>
        <li id="footnote-3">
          If you&apos;re paying close attention, you&apos;ll notice I&apos;m
          waving my hands over the difference beteween &quot;colorings fixed by{' '}
          <Latex>$r$</Latex>&quot; and &quot;rotations that fix{' '}
          <Latex>$x$</Latex>&quot;. These end up summing to the same thing, and
          the intuition works either way, but it&apos;s an important point. If
          you want to prove to yourself why they add up to the same thing,
          imagine drawing a table where the rows are elements of{' '}
          <Latex>$x$</Latex>, the columns are rotations in <Latex>$r$</Latex>,
          and each cell has a checkmark depending on if <Latex>$x$</Latex> is
          fixed by <Latex>$r$</Latex>. It should be clear that the order of
          summation doesn&apos;t matter. <a href="#footnote-3-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
