import styles from '@/assets/pages/index.module.scss';
import Image from 'next/image';
import { ASSETS_PREFIX } from '@/constants';
import RootLayout from '@/components/root-layout';
import { useState } from 'react';
import clsx from 'clsx';
import Docs from '@/components/docs/docs';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://www.npmjs.com/package/@metricinsights/pp-dev" target="_blank" rel="noopener noreferrer">
          <Image
            src={`${ASSETS_PREFIX}/pp-dev.svg`}
            className={styles.logo}
            alt="PPDev Logo"
            width={120}
            height={50}
            priority
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <Image
            className={clsx(styles.logo, styles.logoNextJs)}
            src={`${ASSETS_PREFIX}/next.svg`}
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
          />
        </a>
      </div>
      <h1>PP Dev + Next.js</h1>
      <div className={styles.card}>
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/pages/index.tsx</code> and save to test HMR
        </p>
      </div>
      <p className={styles.readTheDocs}>Click on the PP Dev and Next.js logos to learn more</p>

      <Docs />
    </>
  );
}

Home.layout = RootLayout;
