'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Latex from 'react-latex-next';
import Link from 'next/link';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Why do rotations happen around an axis?</h3>
      <h5>October 13, 2024</h5>
      <p>
        Partway through your introductory linear algebra course, you were
        introduced to the idea of an <i>orthogonal matrix</i>, characterized by
        the property that its columns are orthonormal -- orthogonal, each with
        unit length. You were then told that rotations correspond exactly to the
        orthogonal matrices with determinant 1.
      </p>
      <p>
        Intuitively, this is clear; orthogonal transformations are rigid, like
        rotations. But if we dig into the technical definitions, things start
        getting murky. In 3D, any rotation is around an axis, but how&apos;s
        that have to do with orthogonality? In 2D and 3D, a combination of two
        rotations is another rotation, but in 4D that&apos;s not true anymore.
        And in 2D, there&apos;s no axis of rotation at all. What&apos;s going on
        here? What are rotations, <i>really?</i>
      </p>
      <h4>Rotations in 2D</h4>
      <InfoBox title="Orthogonal Matrices">
        <p>
          An <i>orthogonal matrix</i> <Latex>$M$</Latex> is one with orthonormal
          columns. In other words, if the matrix has columns{' '}
          <Latex>$c_i$</Latex>, i.e. it looks like
        </p>
        <Latex>{`$$\\left(\\begin{array}{c|c|c|c}\\\\c_1&c_2&\\cdots&c_n\\\\\\ \\end{array}\\right)$$`}</Latex>
        then
        <Latex>{`$$c_i \\cdot c_j = \\begin{cases}1 & \\mathrm{if\\ } i = j\\\\0 & \\mathrm{if\\ } i \\neq j\\end{cases}$$`}</Latex>
        <p>
          or more concisely, <Latex>{`$c_i \\cdot c_j = \\delta_{ij}$`}</Latex>,
          where <Latex>{`$\\delta_{ij}$`}</Latex> is the{' '}
          <Link href="https://en.wikipedia.org/wiki/Kronecker_delta">
            Kronecker delta
          </Link>
          . The dot product is important here: in the case where it equals 1, it
          means that <Latex>$c_i \cdot c_i = \lVert c_i\rVert^2 = 1$</Latex>, so
          each vector has unit length, i.e. is normalized. And when{' '}
          <Latex>$c_i \cdot c_j = 0$</Latex> for <Latex>$i \neq j$</Latex>, this
          tells us that differing columns are orthogonal. Hence, such a set of
          vectors is called <i>orthonormal</i>.
        </p>
        <p>
          All eigenvalues of orthogonal matrices have magnitude 1, a fact we
          will make great use of. Roughly, this means that no stretching or
          squishing is going on, and this linear transformation is rigid.
        </p>
      </InfoBox>
      <p>
        The orthogonal matrices in 2D are easy to describe
        <sup>
          <a id="footnote-1-ref" href="#footnote-1">
            [1]
          </a>
        </sup>
        , and are easy to describe. The first column has to be a unit vector,
        and all of the 2D unit vectors can be parameterized by{' '}
        <Latex>$(\cos\theta, \sin\theta)$</Latex>. Then, the second column has
        to be orthogonal to the first, so a 90&deg; rotation of the first column
        gives us <Latex>$(-\sin\theta, \cos\theta)$</Latex>. So our final matrix
        looks like
      </p>
      <Latex>{`$$\\begin{pmatrix}\\cos\\theta&-\\sin\\theta\\\\\\sin\\theta&\\cos\\theta\\end{pmatrix}, \\quad \\theta \\in [0, 2\\pi)$$`}</Latex>
      <p>
        It&apos;s easy to check that the determinant is 1 and that the columns
        are orthonormal (by construction). <Latex>{`$e^{i\\theta}$`}</Latex> is
        an eigenvalue of this matrix, which intuitively makes sense, since it
        also corresponds to a <Latex>$\theta$</Latex>-radian rotation, just in
        the complex plane. Its eigenvector is <Latex>$(i, 1)$</Latex>, which
        corresponds to the orthogonality of the coordinate axes (observe that i
        and 1 are orthogonal in the complex plane). And due to the{' '}
        <Link href="https://en.wikipedia.org/wiki/Complex_conjugate_root_theorem">
          complex conjugate root theorem
        </Link>
        , <Latex>{`$e^{-i\\theta}$`}</Latex> is an eigenvalue as well,
        corresponding to a rotation of <Latex>$-\theta$</Latex> radians, with
        the conjugate eigenvector <Latex>$(-i, 1)$</Latex>.
        <sup>
          <a id="footnote-2-ref" href="#footnote-2">
            [2]
          </a>
        </sup>
      </p>
      <h4>Rotations in 3D</h4>
      <p>
        This is where things get interesting. Unlike in 2D, the 3D orthogonal
        matrices don&apos;t lend themselves to a simple classification. But we
        can do a bit of work to extract some useful results. First, since
        complex eigenvalues come in conjugate pairs, there&apos;ll always be an
        even number of them. Since 3 is odd, we have one real eigenvalue left,
        which must be <Latex>$\lambda_1 = 1$</Latex> since orthogonal matrices
        have eigenvalues of unit length.
        <sup>
          <a id="footnote-3-ref" href="#footnote-3">
            [3]
          </a>
        </sup>{' '}
        So its corresponding eigenvector <Latex>$v_1$</Latex> doesn&apos;t
        change at all under the rotation, and in fact any vector on the axis
        spanned by <Latex>$v_1$</Latex> won&apos;t change either. Thus, the
        existence of an <i>axis of rotation</i> is guaranteed.
      </p>
      <p>
        But there&apos;s more. Remember that conjugate pair of eigenvalues from
        before? Well, since our eigenvalues have unit length, that means
        they&apos;re of the form <Latex>{`$e^{i\\theta}$`}</Latex> and{' '}
        <Latex>{`$e^{-i\\theta}$`}</Latex>, which are exactly the eigenvectors
        of a 2D rotation! In other words, we have a 2D rotation embedded inside
        our 3D rotation, acting in what&apos;s known as the{' '}
        <i>plane of rotation</i>, orthogonal to the axis of rotation.
      </p>
      <p>
        We can make this intuition a bit more precise. In general, any 3D
        orthogonal matrices can be block-diagonalized to look like this:
      </p>
      <Latex>{`$$
        \\begin{pmatrix}\\cos\\theta&-\\sin\\theta&0\\\\\\sin\\theta&\\cos\\theta&0\\\\0&0&1\\end{pmatrix}
      $$`}</Latex>
      <p>
        There&apos;s a 2D rotation matrix hiding in there! This form tells us
        that there&apos;s always a 2D subspace being acted on by a rotation, and
        then an unchanged 1D subspace leftover, which corresponds to the axis of
        rotation. In particular, because this matrix is block-diagonal, we know
        that each subspace operates independently.
      </p>
      <h4>Rotations in Higher Dimensions</h4>
      <p>
        Higher-dimensional rotations have a similar story to 3D. They can always
        be decomposed into 2D rotations acting independently on orthogonal
        subspaces, and if the dimension is odd, then there&apos;s a 1D axis of
        rotation left over. All orthogonal matrices can be block-diagonalized
        into the form
      </p>
      <Latex>{`$$
        \\begin{pmatrix}\\cos\\theta_1&-\\sin\\theta_1&0&0&&0\\\\\\sin\\theta_1&\\cos\\theta_1&0&0&&0\\\\0&0&\\cos\\theta_2&-\\sin\\theta_2&&0\\\\0&0&\\sin\\theta_2&\\cos\\theta_2&&0\\\\&&&&\\ddots&\\\\0&0&0&0&&1\\end{pmatrix}
      $$`}</Latex>
      <p>
        just like in 3D. And the eigenvalues are{' '}
        <Latex>{`$e^{\\pm i\\theta}$`}</Latex> like before as well. Except some
        interesting stuff happens in higher dimensions. For example, any
        composition of rotations in 3D{' '}
        <Link href="https://en.wikipedia.org/wiki/Euler%27s_rotation_theorem">
          is a rotation
        </Link>
        , but not so in 4D! Why? Well, every rotation comes with a pair of
        conjugate eigenvalues, so 3 dimensions can only fit one pair (i.e. one
        rotation), but 4 dimensions lets us fit two pairs. More concretely, this
        corresponds to independent rotations, say in the XY and ZW planes, that
        can&apos;t be combined into a single rotation.
      </p>
      <p>
        So it would appear that rotation is fundamentally a 2D concept, and
        higher dimensions simply emulate the process in 2D subspaces. And the 2D
        nature of rotations is due to the two dimensions of the complex plane, a
        concept uniquely well-suited to describing rotations. Multiplying by
        complex numbers is rotation, after all, so the connection is impossible
        to avoid.
      </p>
      <div className="flex flex-row justify-center">
        <div className="w-[90%] h-[1px] bg-gray-400 mt-4" />
      </div>
      <ol className="list-decimal flex flex-col gap-4 mx-8 text-sm">
        <li id="footnote-1">
          There&apos;s technically a single 1D orthogonal matrix, the identity
          matrix <Latex>$(1)$</Latex>, since it&apos;s the only 1x1 matrix with
          unit determinant. It&apos;s a zero-degree rotation!{' '}
          <a href="#footnote-1-ref">&#8617;</a>
        </li>
        <li id="footnote-2">
          The linked theorem leads immediately to eigenvalues coming in
          conjugate pairs. Eigenvalues are exactly the solutions to the
          characteristic polynomial <Latex>$\det(M - \lambda I) = 0$</Latex>, so
          if <Latex>$M$</Latex> has all real entries, then the characteristic
          polynomial has real coefficients and the theorem applies.{' '}
          <a href="#footnote-2-ref">&#8617;</a>
        </li>
        <li id="footnote-3">
          -1 is the only other real number with unit length, but since rotations
          have positive determinant equal to the product of all eigenvalues, it
          has to be +1. <a href="#footnote-3-ref">&#8617;</a>
        </li>
      </ol>
    </PageTemplate>
  );
}
