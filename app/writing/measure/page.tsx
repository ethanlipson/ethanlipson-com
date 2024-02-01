'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Continuity of Measure</h3>
      <h5>January 31, 2024</h5>
      <p>
        My friend Rohan recently posed a problem to me: can you think of a
        collection of sets <Latex>$A_k$</Latex> such that the finite
        intersections <Latex>{'$\\bigcap_{k=1}^n A_k$'}</Latex> are nonempty for
        all integers <Latex>$n$</Latex>, but the infinite intersection{' '}
        <Latex>{'$\\bigcap_{k=1}^\\infty A_k$'}</Latex> is empty?
      </p>
      <p>
        Anyway, it reminded me of this neat idea in measure theory, so I wrote
        him a brief summary and figured I should put it here too.
      </p>
      <p>
        <a href="/media/writing/measure/Continuity_of_Measure.pdf">
          Continuity of Measure (PDF)
        </a>
      </p>
    </PageTemplate>
  );
}
