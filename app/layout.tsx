import './globals.css';
import type { Metadata } from 'next';
import { Raleway } from 'next/font/google';

const ralewayHeavy = Raleway({
  subsets: ['latin'],
  weight: '800',
  variable: '--font-raleway-heavy',
});
const raleway = Raleway({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: 'Ethan Lipson',
  description: "Ethan Lipson's personal website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
