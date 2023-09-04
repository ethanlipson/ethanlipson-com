'use client';

import InfoBox from '@/src/components/infoBox';
import PageTemplate from '@/src/components/pageTemplate';
import Link from 'next/link';
import '../globals.css';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h1>Writing</h1>
      <InfoBox title="Disclaimer">
        <p>
          While the math presented in these articles is accurate, the
          terminology may be altered/simplified avoid unnecessary technical
          details. In such cases, footnotes will link to the relevant Wikipedia
          articles.
        </p>
      </InfoBox>
      <p>
        September 4, 2023
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
