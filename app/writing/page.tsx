'use client';

import InfoBox from '@/src/components/infoBox';
import PageTemplate from '@/src/components/pageTemplate';
import Link from 'next/link';
import '../globals.css';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h1>Writing</h1>
      <p>
        September 6, 2023
        <br />
        <Link href="/writing/tensors">
          <b>What the **** is a tensor?</b>
        </Link>
      </p>
      <p>
        September 2, 2023
        <br />
        <Link href="/writing/complex">
          <b>Complex Numbers are Secretly Polynomials</b>
        </Link>
      </p>
    </PageTemplate>
  );
}
