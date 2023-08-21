import './globals.css';
import type { Metadata } from 'next';

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
