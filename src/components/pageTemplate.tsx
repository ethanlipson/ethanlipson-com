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
      />
      <main className="py-24 bg-white flex justify-center">
        <div
          className={`w-5/6 max-w-3xl flex flex-col gap-4 [&>h1]:text-5xl [&>h2]:text-4xl [&>h3]:text-3xl [&>h1]:text-center [&>h2]:text-center [&>h3]:text-center [&>h1]:uppercase [&>h2]:uppercase [&>h3]:uppercase [&>p]:text-md`}
        >
          {children}
          <style>{`
            h1, h2, h3 {
              font-family: ${ralewayHeavy.style.fontFamily};
            }

            p {
              font-family: ${raleway.style.fontFamily};
            }
          `}</style>
        </div>
      </main>
      <footer className="bg-[#1f1f1f] py-12" />
    </>
  );
}
