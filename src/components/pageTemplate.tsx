import { Raleway } from 'next/font/google';
import Navbar from './navbar';

const ralewayHeavy = Raleway({
  subsets: ['latin'],
  weight: '800',
});
const raleway = Raleway({
  subsets: ['latin'],
  weight: '500',
});

interface Props {
  children: React.ReactNode;
  highlightWriting?: boolean;
  highlightAbout?: boolean;
}

export default function PageTemplate({
  children,
  highlightWriting,
  highlightAbout,
}: Props) {
  return (
    <>
      <Navbar
        highlightWriting={highlightWriting}
        highlightAbout={highlightAbout}
        startWithCloseAnimation
      />
      <main className="py-24 bg-white flex justify-center">
        <div
          className={`w-5/6 max-w-3xl flex flex-col gap-4 [&_h1]:text-5xl [&_h2]:text-4xl [&_h3]:text-3xl [&_h4]:text-2xl [&_h5]:text-xl [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center [&_h4]:text-center [&_h5]:text-center [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase [&_p]:text-md`}
        >
          {children}
          <style>{`
            h1, h2, h3 {
              font-family: ${ralewayHeavy.style.fontFamily};
            }

            p, h4, h5 {
              font-family: ${raleway.style.fontFamily};
            }
          `}</style>
        </div>
      </main>
      <footer className="bg-[#1f1f1f] py-12" />
    </>
  );
}
