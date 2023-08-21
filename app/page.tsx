'use client';

import Navbar from '@/src/components/navbar';
import { Raleway } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const ralewayHeavy = Raleway({ subsets: ['latin'], weight: '800' });
const raleway = Raleway({ subsets: ['latin'], weight: '500' });

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
    <>
      <Navbar />
      <main className="py-24 bg-white flex justify-center">
        <div className="w-5/6 max-w-3xl flex flex-col gap-4">
          <h1
            className={`${ralewayHeavy.className} text-5xl text-center uppercase`}
          >
            Home
          </h1>
          <p className={`${raleway.className} text-md`}>
            I'm Ethan Lipson, rising sophomore at Columbia University and
            Stuyvesant High School alumnus studying mathematics.
          </p>
          <p className={`${raleway.className} text-md`}>
            I take pride in my programming ability, specifically in my knowledge
            of parallel GPU computation. It's the secret ingredient that allows
            me to take my understanding of advanced math and turn it into real,
            tangible software -- check out my projects to see.
          </p>
          <p className={`${raleway.className} text-md`}>
            View my resume <Link href="/resume.pdf">here</Link>.
          </p>
          <h1
            className={`${ralewayHeavy.className} text-5xl text-center uppercase`}
          >
            My Work
          </h1>
          <div className="flex flex-row justify-center">
            <div className="w-5/6 grid grid-cols-4 grid-rows-3 gap-x-[1%] gap-y-[4%]">
              {videos.map((video, i) => (
                <video
                  key={i}
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
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-[#1f1f1f] py-12" />
    </>
  );
}
