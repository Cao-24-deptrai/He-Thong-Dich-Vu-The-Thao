'use client';

import './globals.css';
import { Barlow, Lexend } from 'next/font/google';
import { PosThemeProvider } from '@/lib/pos-theme';

const barlow = Barlow({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lexend',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${barlow.variable} ${lexend.variable}`}>
      <head>
        <title>Phanta Sports - Hệ thống Web POS Quầy Thu Ngân</title>
        <link rel="icon" href="/Phanta Sports Booking Emblem.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-lexend antialiased">
        <PosThemeProvider>{children}</PosThemeProvider>
      </body>
    </html>
  );
}
