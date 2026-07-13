import { Inter } from 'next/font/google';
import '@/app/globals.scss';
import Head from 'next/head';
import React from 'react';
import { ASSETS_PREFIX } from '@/constants';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>PP Dev + Next.js</title>
        <link rel="icon" href={`${ASSETS_PREFIX}/pp-dev.svg?svg`} type="image/svg" sizes="32x32" />
      </Head>
      <div className={inter.className}>{children}</div>
    </>
  );
}
