'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Latex from 'react-latex-next';
import universal1 from '@/public/media/writing/tensors/universal1.png';
import universal2 from '@/public/media/writing/tensors/universal2.png';
import universal3 from '@/public/media/writing/tensors/universal3.png';
import Image from 'next/image';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>What the **** is a tensor?</h3>
      <h5>September 4, 2023</h5>
      <p>
        A computer scientist will tell you that a tensor is a multidimensional
        array. In differential geometry, they use tensors to talk about
        &quot;multilinear maps&quot;, whatever that means. Mathematicians will
        just say that a tensor is &quot;anything that behaves like a
        tensor&quot;. Not helpful.
      </p>
      <p>
        In this article we&apos;re going to explore a view of tensors that, to
        my knowledge, has not yet been presented on the internet. There&apos;s a
        big problem in linear algebra, and tensors are the unique objects that
        exactly solve this problem.
      </p>
      <h4>Almost Linear</h4>
      <InfoBox title="Linearity Refresher">
        <p>
          A function <Latex>$f$</Latex> is linear if it obeys the following two
          rules:
        </p>
        <Latex>
          $$f(u + v) = f(u) + f(v)$$$$\lambda f(v) = f(\lambda v) = f(\lambda
          v_1, \ldots, \lambda v_n)$$
        </Latex>
        <p>
          Note that on the second line, the <Latex>$\lambda$</Latex> distributes
          to all arguments of <Latex>$f$</Latex>.
        </p>
      </InfoBox>
      <p>
        Linear algebra is the study of linear functions, described above.
        It&apos;s unique in that, in a sense, the field is almost solved.
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>{' '}
        If you&apos;ve taken an intro course, you might have noticed that we
        have an extremely rich theory of how linear functions behave. So
        naturally, if we want to understand a function better, we might try to
        examine it from the perspective of linear algebra.
      </p>
      <p>
        Consider the humble dot product, denoted by{' '}
        <Latex>$\langle\cdot,\cdot\rangle$</Latex>. If you&apos;ve used it
        before, you&apos;ll know that it&apos;s <i>kind of</i> linear, but only
        in one argument at a time.
      </p>
      <Latex>
        $$\lambda\langle u, v\rangle = \langle\lambda u, v\rangle$$$$\langle u +
        v, w\rangle = \langle u, w\rangle + \langle v, w\rangle$$
      </Latex>
      <p>
        If it were linear, we would expect the <Latex>$\lambda$</Latex> to
        distribute to <i>all</i> arguments.
      </p>
      <Latex>
        $$\lambda\langle u, v\rangle = \langle\lambda u, \lambda v\rangle$$
      </Latex>
      <p>
        {`But if you've used the dot product before, you know it doesn't work like
        that. This is a big problem, because it means all of linear algebra
        doesn't automatically apply. We can't talk about the null space, or
        eigenvalues, or anything like that. :(`}
      </p>
      <p>
        Ideally, we&apos;d like to &quot;make&quot; the dot product linear,
        which we can do by changing the space we&apos;re working in. Consider
        the map <Latex>$M(u, v) = uv^\intercal$</Latex>, which takes two vectors
        in <Latex>$\mathbb R^3$</Latex> and gives us a matrix in{' '}
        <Latex>{'$\\mathbb R^{3 \\times 3}$'}</Latex>. More explicitly, it looks
        like
      </p>
      <Latex>
        {`$$(u, v) \\mapsto \\begin{pmatrix}
            u_1v_1 & u_1v_2 & u_1v_3 \\\\
            u_2v_1 & u_2v_2 & u_2v_3 \\\\
            u_3v_1 & u_3v_2 & u_3v_3
          \\end{pmatrix}$$`}
      </Latex>
      <p>
        The dot product would then correspond to the sum of the diagonal
        entries, also known as the <i>trace</i> of a matrix. Except, you might
        notice something: the trace is linear! For any matrix <Latex>$A$</Latex>
        , we have
      </p>
      <Latex>
        {`$$\\lambda\\mathrm{tr}(A) = \\mathrm{tr}(\\lambda A)$$$$= \\mathrm{tr}\\begin{pmatrix}
            \\lambda A_{11} & \\lambda A_{12} & \\lambda A_{13} \\\\
            \\lambda A_{21} & \\lambda A_{22} & \\lambda A_{23} \\\\
            \\lambda A_{31} & \\lambda A_{32} & \\lambda A_{33}
          \\end{pmatrix}$$`}
      </Latex>
      <p>
        (Observe how the <Latex>$\lambda$</Latex> distributes to all arguments).
        Somehow, we&apos;ve turned a nonlinear function into a linear function,
        allowing us to employ the vast wealth of linear algebra knowledge
        we&apos;ve accumulated over hundreds of years. To sum up the situation
        in a diagram,
      </p>
      <div className="flex justify-center">
        <Image
          src={universal1}
          alt="Universal Property of Tensors Example"
          className="w-64"
        />
      </div>
      <p>
        We can take the diagonal path directly using the dot product, or we can
        take a detour through <Latex>{'$\\mathbb R^{3 \\times 3}$'}</Latex>. If
        we take that detour, we get the bonus of having a linear function.
        Either way, you&apos;ll get the same answer.
        <sup>
          <a id="footnote-2-ref" href="#footnote-2">
            [2]
          </a>
        </sup>{' '}
        Take some time to really understand what this diagram is saying --
        it&apos;s not obvious.
      </p>
      <p>
        For any &quot;almost linear&quot; function (what we&apos;d call
        bilinear), we can draw a similar diagram and get a linear function out
        of it.
      </p>
      <div className="flex justify-center">
        <Image
          src={universal2}
          alt="Universal Property of Tensors with Question Mark"
          className="w-64"
        />
      </div>
      <p>
        In our dot product example, we had{' '}
        <Latex>{'$\\mathbb R^{3 \\times 3}$'}</Latex> in the top right. But in
        general, what should fill the spot of that question mark? Why, the
        tensor product of course!
      </p>
      <h4>The Tensor Product</h4>
      <p>
        The tensor product of two vector spaces, <Latex>$U \otimes V$</Latex>,
        lets us build a new, larger vector space that solves our linearity
        problem.
        <sup>
          <a id="footnote-3-ref" href="#footnote-3">
            [3]
          </a>
        </sup>{' '}
        Here&apos;s how it works:
      </p>
      <ol className="list-decimal flex flex-col gap-4">
        <li>
          For any two vectors <Latex>$u, v$</Latex> in <Latex>$U$</Latex> and{' '}
          <Latex>$V$</Latex>, we can &quot;glue&quot; them together using{' '}
          <Latex>$\otimes$</Latex>, and the resulting object,{' '}
          <Latex>$u \otimes v$</Latex>, is an element of{' '}
          <Latex>$U \otimes V$</Latex>. We call this object a <i>tensor</i>.
        </li>
        <li>
          Pick bases <Latex>$(u_i)$</Latex> and <Latex>$(v_j)$</Latex> for{' '}
          <Latex>$U$</Latex> and <Latex>$V$</Latex>. The basis for{' '}
          <Latex>$U \otimes V$</Latex> then looks like every combination of{' '}
          <Latex>$u_i \otimes v_j$</Latex>.
          <sup>
            <a id="footnote-4-ref" href="#footnote-4">
              [4]
            </a>
          </sup>{' '}
          As a result,{' '}
          <Latex>$\dim(U \otimes V) = \dim(U) \cdot \dim(V)$</Latex>.
        </li>
        <li>
          Scalars can freely move around tensors. For any{' '}
          <Latex>$u \otimes v$</Latex>, we have{' '}
          <Latex>
            $\lambda(u \otimes v) = \lambda u \otimes v = u \otimes \lambda v$
          </Latex>
          .
        </li>
        <li>
          Tensors are additive. In other words,{' '}
          <Latex>$(u + v) \otimes w = u \otimes w + v \otimes w$</Latex>. The
          same is true for the other component as well.
        </li>
      </ol>
      <InfoBox title="Is that it?">
        <p>
          It&apos;s at this point that many people ask, &quot;ok, but{' '}
          <i>what is </i>
          <Latex>$u \otimes v$</Latex>? What does it mean?&quot; It may be hard
          to accept, but the truth is that the <Latex>$\otimes$</Latex> symbol
          really doesn&apos;t <i>mean</i> anything -- it&apos;s just a glue
          holding two vectors together. Treat it as a symbol that we manipulate
          according to certain rules, and nothing more.
          <sup>
            <a id="footnote-5-ref" href="#footnote-5">
              [5]
            </a>
          </sup>
        </p>
      </InfoBox>
      <p>
        Returning to our example, notice that{' '}
        <Latex>
          {
            '$\\dim(\\mathbb R^3 \\otimes \\mathbb R^3) = \\dim(\\mathbb R^{3 \\times 3}) = 9$'
          }
        </Latex>{' '}
        as we expect. More explicitly, the correspondence might look something
        like
        <Latex>
          {`$$A_{ij} \\Longleftrightarrow e_i \\otimes e_j$$$$\\begin{pmatrix}
            e_1 \\otimes e_1 & e_1 \\otimes e_2 & e_1 \\otimes e_3 \\\\
            e_2 \\otimes e_1 & e_2 \\otimes e_2 & e_2 \\otimes e_3 \\\\
            e_3 \\otimes e_1 & e_3 \\otimes e_2 & e_3 \\otimes e_3
          \\end{pmatrix}$$`}
        </Latex>{' '}
        where <Latex>$e_i$</Latex> is the standard basis for{' '}
        <Latex>$\mathbb R^3$</Latex>. Every matrix is the sum of 9 basis
        matrices, and every tensor is the sum of 9 basis tensors{' '}
        <Latex>$e_i \otimes e_j$</Latex>. But equipped with the general language
        of tensor products, we no longer need to talk about matrices to solve
        our linearity problem.
      </p>
      <p>
        Note that not every tensor in <Latex>$U \otimes V$</Latex> can be
        written as <Latex>$u \otimes v$</Latex>; in general, all tensors are the
        sum of simpler tensors, like{' '}
        <Latex>$u_1 \otimes v_1 + \cdots + u_n \otimes v_n$</Latex>. These
        simpler tensors are called <i>pure tensors</i>.
      </p>
      <h4>What Tensors Do for Us</h4>
      <p>
        Barring a couple details I omitted, what you see above is the full
        construction of the tensor product. What&apos;s so great about it? Going
        back to our problem from earler, remember that we wanted to turn a
        bilinear function into a linear one. The tensor product is the unique
        space that lets us do this. Finally, we can complete the diagram:
      </p>
      <div className="flex justify-center">
        <Image
          src={universal3}
          alt="Universal Property of Tensors"
          className="w-64"
        />
      </div>
      <p>
        We wanted a linear map that agrees with the bilinear map on every input.{' '}
        <Latex>$U \otimes V$</Latex> is the <i>unique</i> space that gives us a{' '}
        <i>unique</i> agreeing linear map.
        <sup>
          <a id="footnote-6-ref" href="#footnote-6">
            [6]
          </a>
        </sup>{' '}
        If we wanted, we could have a larger space containing{' '}
        <Latex>$U \otimes V$</Latex>, and we would certainly still have our
        linear map. But, it would no longer be unique.
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          This is a bit of an exaggeration, although there certainly is an
          element of truth to it. What&apos;s definitely true is that we have an
          extremely strong understanding of finite-dimensional linear algebra as
          presented in most introductory courses. Read{' '}
          <a target="_blank" href="https://math.stackexchange.com/a/1700876">
            this
          </a>{' '}
          Math Stack Exchange answer for more context.{' '}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          A diagram like this, where you can take any path you want and get the
          same answer, is called a{' '}
          <a
            target="_blank"
            href="https://en.wikipedia.org/wiki/Commutative_diagram"
          >
            commutative diagram
          </a>
          . They come from{' '}
          <a
            target="_blank"
            href="https://en.wikipedia.org/wiki/Category_theory"
          >
            category theory
          </a>
          , a language that attempts to describe mathematics in the most
          abstract terms possible -- it has been called &quot;the mathematics of
          mathematics&quot;. <a href="#footnote-2-ref">&#8617;</a>
        </li>
        <li id="footnote-3">
          Larger in the sense that <Latex>$a \cdot b$</Latex> is typically
          larger than <Latex>$a + b$</Latex>. Recall that{' '}
          <Latex>{'$\\dim{A \\times B} = \\dim A + \\dim B$'}</Latex>.{' '}
          <a href="#footnote-3-ref">&#8617;</a>
        </li>
        <li id="footnote-4">
          It&apos;s at this point that any mathematicians in the audience would
          complain that our construction is not basis-independent, to which I
          respond with two points:
          <ul className="list-disc flex flex-col ml-8 mt-4">
            <li>
              The resulting space ends up being the same no matter which basis
              you choose.
            </li>
            <li>
              The tensor product can be constructed using{' '}
              <a
                target="_blank"
                href="https://en.wikipedia.org/wiki/Quotient_space_(linear_algebra)"
              >
                quotient spaces
              </a>
              , as described in{' '}
              <a
                target="_blank"
                href="https://en.wikipedia.org/wiki/Tensor_product#As_a_quotient_space"
              >
                this article
              </a>{' '}
              and in{' '}
              <a
                target="_blank"
                href="https://www.youtube.com/watch?v=K7f2pCQ3p3U"
              >
                this excellent video
              </a>{' '}
              by Michael Penn. Such a construction has the advantage of not
              requiring us to pick a basis, but it may be less intuitive.{' '}
              <a href="#footnote-4-ref">&#8617;</a>
            </li>
          </ul>{' '}
        </li>
        <li id="footnote-5">
          This attitude towards mathematics is called{' '}
          <a
            target="_blank"
            href="https://en.wikipedia.org/wiki/Formalism_(philosophy_of_mathematics)"
          >
            formalism
          </a>
          , and it&apos;s been the predominant view held by mathematicians since
          the mid-20th century. Essentially, it states that math is not
          &quot;about&quot; anything at all, only moving around symbols.{' '}
          <a href="#footnote-5-ref">&#8617;</a>
        </li>
        <li id="footnote-6">
          Unique up to a{' '}
          <a target="_blank" href="https://en.wikipedia.org/wiki/Isomorphism">
            relabeling
          </a>
          , of course. We could give each element of{' '}
          <Latex>$U \otimes V$</Latex> a new name and it would still be the same
          thing. <a href="#footnote-6-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
