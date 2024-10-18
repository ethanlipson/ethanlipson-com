import Navbar from './navbar';

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
        <div className="w-5/6 max-w-3xl flex flex-col gap-4 [&_h1]:text-5xl [&_h2]:text-4xl [&_h3]:text-3xl [&_h4]:text-2xl [&_h5]:text-xl [&_h6]:text-md [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center [&_h4]:text-center [&_h5]:text-center [&_h6]:text-center [&_h1]:uppercase [&_h2]:uppercase [&_h3]:uppercase [&_p]:text-md [&_h1]:font-big [&_h2]:font-big [&_h3]:font-big [&_p]:font-small [&_h4]:font-small [&_h5]:font-small [&_h6]:font-small [&_ol]:font-small">
          {children}
        </div>
      </main>
      <footer className="bg-[#1f1f1f] py-12" />
    </>
  );
}
