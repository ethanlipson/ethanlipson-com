import { Ubuntu } from 'next/font/google';
import { useState } from 'react';
import 'tailwindcss/tailwind.css';
import '../../app/hamburgers.css';

const ubuntu = Ubuntu({ subsets: ['latin'], weight: '400' });

interface Props {
  highlightWriting?: boolean;
  highlightAbout?: boolean;
}

export default function Navbar({ highlightWriting, highlightAbout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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
      <div
        className={`transition-all duration-300 ${
          menuOpen ? 'max-h-64' : 'max-h-24'
        } overflow-hidden`}
      >
        <div className="@xl:hidden flex flex-col items-center justify-center py-8 gap-12 bg-black uppercase tracking-widest">
          <button
            className={`absolute left-2 top-5 hamburger hamburger--collapse ${
              menuOpen ? 'is-active' : ''
            }`}
            type="button"
            onClick={() => setMenuOpen(open => !open)}
          >
            <span className="hamburger-box">
              <span className="hamburger-inner"></span>
            </span>
          </button>
          {home}
          {writing}
          {about}
        </div>
        <div className="@xl:flex hidden flex-row items-center justify-center py-8 gap-12 bg-black uppercase tracking-widest">
          {writing}
          {home}
          {about}
        </div>
      </div>
    </nav>
  );
}
