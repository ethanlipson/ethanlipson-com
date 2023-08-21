'use client';

import Navbar from '@/src/components/navbar';
import { Raleway } from 'next/font/google';
import Link from 'next/link';
import '../globals.css';

const ralewayHeavy = Raleway({ subsets: ['latin'], weight: '800' });
const raleway = Raleway({ subsets: ['latin'], weight: '500' });

export default function About() {
  return (
    <>
      <Navbar highlightAbout />
      <main className="py-24 bg-white flex justify-center">
        <div className="w-5/6 max-w-3xl flex flex-col gap-4">
          <h1
            className={`${ralewayHeavy.className} text-5xl text-center uppercase`}
          >
            About
          </h1>
          <p className={`${raleway.className} text-md`}>
            Email:{' '}
            <Link href="mailto:ethan.lipson@columbia.edu">
              ethan.lipson@columbia.edu
            </Link>
          </p>
          <p className={`${raleway.className} text-md`}>
            My <Link href="/resume.pdf">resume</Link>
          </p>
        </div>
      </main>
      <footer className="bg-[#1f1f1f] py-12" />
    </>
  );
}
