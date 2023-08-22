'use client';

import PageTemplate from '@/src/components/pageTemplate';
import Link from 'next/link';
import './globals.css';

const videos = [
  'fluid',
  'metaballs-3d',
  'julia-sets',
  'boids',
  'cloth',
  'gravity',
  'jets',
  'non-euclidean',
  'raytracing',
  'strange-attractors',
  'electrons',
  'heat-simulation',
];

export default function Home() {
  return (
    <PageTemplate>
      <h1>Home</h1>
      <p>
        I&apos;m Ethan Lipson, rising sophomore at Columbia University and
        Stuyvesant High School alumnus studying mathematics.
      </p>
      <p>
        I take pride in my programming ability, specifically in my knowledge of
        parallel GPU computation. It&apos;s the secret ingredient that allows me
        to take my understanding of advanced math and turn it into real,
        tangible software -- check out my projects to see.
      </p>
      <p>
        View my resume <Link href="/resume.pdf">here</Link>.
      </p>
      <h1>My Work</h1>
      <div className="flex flex-row justify-center">
        <div className="w-5/6 grid grid-cols-4 grid-rows-3 gap-x-[1%] gap-y-[4%]">
          {videos.map((video, i) => (
            <Link key={i} href={`demos/${video}`}>
              <video
                muted
                playsInline
                onMouseOver={event => {
                  (event.target as HTMLVideoElement).play();
                }}
                onMouseOut={event => {
                  (event.target as HTMLVideoElement).pause();
                  (event.target as HTMLVideoElement).currentTime = 0;
                }}
                onTouchStart={event => event.stopPropagation()}
                onTouchMove={event => event.stopPropagation()}
                onTouchEnd={event => event.stopPropagation()}
              >
                <source
                  src={`/demo-videos/${video}.mp4#t=0.05`}
                  type="video/mp4"
                />
              </video>
            </Link>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
}
