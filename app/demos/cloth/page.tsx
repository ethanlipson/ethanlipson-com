'use client';

// import Demo from '../../demo-files/cloth/demo';
import Demo from '@/src/demos/cloth/demo';
import { NextPage } from 'next';
// import DemoTemplate from '../../components/DemoTemplate';
import { Raleway } from 'next/font/google';
import DemoTemplate from '@/src/components/demoTemplate';
import Link from 'next/link';

const ralewayHeavy = Raleway({ subsets: ['latin'], weight: '800' });
const raleway = Raleway({ subsets: ['latin'], weight: '500' });

const Cloth: NextPage = () => {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>About</h1>
      <p>
        Email:{' '}
        <Link href="mailto:ethan.lipson@columbia.edu">
          ethan.lipson@columbia.edu
        </Link>
      </p>
      <p>
        My <Link href="/resume.pdf">resume</Link>
      </p>
    </DemoTemplate>
  );
};

export default Cloth;
