import { Ubuntu } from 'next/font/google';
import 'tailwindcss/tailwind.css';

const ubuntu = Ubuntu({ subsets: ['latin'], weight: '400' });

interface Props {
  highlightWriting?: boolean;
  highlightAbout?: boolean;
}

export default function Navbar({ highlightWriting, highlightAbout }: Props) {
  const home = (
    <a href="/" className="text-white text-3xl">
      Ethan Lipson
    </a>
  );
  const writing = (
    <a
      href="/writing"
      className={`${
        highlightWriting ? 'text-white' : 'text-[#b4b4b4]'
      } transition hover:text-white text-xl`}
    >
      Writing
    </a>
  );
  const about = (
    <a
      href="/about"
      className={`${
        highlightAbout ? 'text-white' : 'text-[#b4b4b4]'
      }  transition hover:text-white text-xl`}
    >
      About
    </a>
  );

  return (
    <nav className={`${ubuntu.className} @container`}>
      <div className="@xl:hidden flex flex-col items-center justify-center py-8 gap-12 bg-black uppercase tracking-widest">
        {home}
        {writing}
        {about}
      </div>
      <div className="@xl:flex hidden flex-row items-center justify-center py-8 gap-12 bg-black uppercase tracking-widest">
        {writing}
        {home}
        {about}
      </div>
    </nav>
  );
}
