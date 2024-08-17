'use client';

import PageTemplate from '@/src/components/pageTemplate';
import Link from 'next/link';
import './globals.css';
import { isMobile } from 'react-device-detect';
import Image from 'next/image';

const videos = [
  'boids',
  'cloth',
  'fluid',
  'flow',
  'metaballs-3d',
  'julia-sets',
  'gravity',
  'jets',
];

export default function Home() {
  return (
    <PageTemplate>
      <h1>Home</h1>
      <p>
        I&apos;m a rising junior at Columbia studying Applied Math. I&apos;m
        currently conducting research with Changxi Zheng on differentiable fluid
        simulation, with the goal of massively speeding up the design of
        vehicles with aero/hydrodynamic properties like airplanes, cars, and
        submarines.
      </p>
      <p>
        These demos are made possible by GPU parallelization, allowing
        computations to be performed hundreds of times faster than usual.
        It&apos;s what allows me to turn a passion for math into real, tangible
        software.
      </p>
      <p>
        I have beaten the most highly decorated International Math Olympiad gold
        medalist at poker.
      </p>
      <p>
        View my resume <Link href="/resume.pdf">here</Link>.
      </p>
      <h1>My Work</h1>
      <h5>Interactive Demos - Click to Try</h5>
      <div className="flex flex-row justify-center">
        <div className="w-5/6 grid sm:grid-cols-4 sm:grid-rows-2 grid-cols-2 grid-rows-4 gap-x-[1%] gap-y-[2%] sm:gap-y-[4%] grid-flow-row sm:grid-flow-col">
          {videos.map((video, i) => (
            <Link key={i} href={`demos/${video}`}>
              {isMobile ? (
                <Image
                  src={`/media/demos/images/${video}.png`}
                  width={300}
                  height={300}
                  alt={video}
                />
              ) : (
                <video
                  loop
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
                    src={`/media/demos/videos/${video}.mp4#t=0.05`}
                    type="video/mp4"
                  />
                </video>
              )}
            </Link>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
}
