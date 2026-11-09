import { Inter } from 'next/font/google';
import '@/app/globals.scss';
import Head from 'next/head';
import React from 'react';
import ppDevLogo from '@/assets/img/pp-dev.svg';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>PP Dev + Next.js</title>
        <link rel="icon" href={ppDevLogo.src} type="image/svg+xml" sizes="32x32" />
      </Head>
      <div className={inter.className}>{children}</div>
    </>
  );
}
