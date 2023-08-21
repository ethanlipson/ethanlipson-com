'use client';

import Navbar from '@/src/components/navbar';
import { Raleway } from 'next/font/google';
import Link from 'next/link';
import Demo from '../demos/cloth/demo';
// import '../globals.css';
import '../../app/globals.css';
import PageTemplate from './pageTemplate';

const ralewayHeavy = Raleway({ subsets: ['latin'], weight: '800' });
const raleway = Raleway({ subsets: ['latin'], weight: '500' });

interface Props {
  children: React.ReactNode;
  demo: React.ReactNode;
}

// export default function DemoTemplate() {
export default function DemoTemplate({ children, demo }: Props) {
  return (
    <div className="flex flex-row">
      <div className="overflow-hidden">
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {demo}
        </div>
      </div>
      <div className="shrink-0 flex flex-col w-1/4">
        <PageTemplate>{children}</PageTemplate>
      </div>
    </div>
  );
}
