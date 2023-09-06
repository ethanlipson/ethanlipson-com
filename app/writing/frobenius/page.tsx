'use client';

import PageTemplate from '@/src/components/pageTemplate';
import '../../globals.css';
import 'katex/dist/katex.min.css';
import InfoBox from '@/src/components/infoBox';
import Latex from 'react-latex-next';
import Image from 'next/image';

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h3>Where are the 3D complex numbers?</h3>
      <h5>September 6, 2023</h5>
    </PageTemplate>
  );
}
