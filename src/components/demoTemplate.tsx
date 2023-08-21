'use client';

import { Raleway } from 'next/font/google';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import '../../app/globals.css';
import PageTemplate from './pageTemplate';

interface Props {
  children: React.ReactNode;
  demo: React.ReactNode;
}

// export default function DemoTemplate() {
export default function DemoTemplate({ children, demo }: Props) {
  const [infoBoxShowing, setInfoBoxShowing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobile && buttonRef.current) {
      buttonRef.current.click();
    }
  }, []);

  return (
    <div className="flex flex-row max-h-[100dvh] @container">
      <div className="overflow-hidden">
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {demo}
        </div>
      </div>

      <div
        className={`shrink-0 flex flex-col transition-all duration-300 ${
          infoBoxShowing
            ? isMobile
              ? 'w-full'
              : 'min-w-[32rem] w-1/4'
            : 'min-w-0 w-0'
        } overflow-x-visible overflow-y-scroll relative`}
      >
        <PageTemplate>{children}</PageTemplate>
      </div>
      <button
        onClick={() => setInfoBoxShowing(showing => !showing)}
        className={`absolute transition-all duration-300 ${
          infoBoxShowing
            ? `${
                isMobile
                  ? 'left-0'
                  : 'right-[max(25%,32rem)] translate-x-[calc(100%-1px)]'
              }`
            : 'right-0'
        } top-1/2 -translate-y-1/2`}
        ref={buttonRef}
      >
        {infoBoxShowing && (
          <Image src="/tabs/tab-right.svg" alt="" width={25} height={0} />
        )}
        {!infoBoxShowing && (
          <Image src="/tabs/tab-left-2.svg" alt="" width={25} height={0} />
        )}
      </button>
    </div>
  );
}
