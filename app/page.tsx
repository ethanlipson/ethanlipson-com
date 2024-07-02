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
      <div className="flex flex-row justify-center">
        <div className="w-5/6 grid grid-cols-4 grid-rows-3 gap-x-[1%] gap-y-[4%]">
          {videos.map((video, i) => (
            <Link key={i} href={`demos/${video}`}>
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
            </Link>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
}
