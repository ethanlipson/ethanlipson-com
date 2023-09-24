'use client';

import PageTemplate from '@/src/components/pageTemplate';
import Link from 'next/link';
import '../globals.css';

export default function About() {
  return (
    <PageTemplate highlightAbout>
      <h1>About</h1>
      <p>
        Email:{' '}
        <Link href="mailto:ethan.lipson@columbia.edu">
          ethan.lipson@columbia.edu
        </Link>
      </p>
      <p>
        <Link href="/resume.pdf">Resume</Link>
      </p>
      <p>
        <Link href="https://www.linkedin.com/in/ethan-lipson/">LinkedIn</Link>
      </p>
    </PageTemplate>
  );
}
