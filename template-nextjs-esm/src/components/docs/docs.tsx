import styles from './docs.module.scss';
import Image from 'next/image';
import { ASSETS_PREFIX } from '@/constants';
import clsx from 'clsx';

export default function Docs() {
  return (
    <>
      <div className={styles.docs}>
        <a
          className={styles.docs__item}
          href="https://www.npmjs.com/package/@metricinsights/pp-dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className={clsx(styles.docs__item__logo)}
            src={`${ASSETS_PREFIX}/pp-dev.svg`}
            width={150}
            height={50}
            alt={'PP Dev'}
          />
          <div className={styles.docs__item__title}>PP Dev</div>
          <div className={styles.docs__item__description}>PP Dev docs</div>
        </a>

        <a className={styles.docs__item} href="https://nextjs.org" target="_blank" rel="noopener noreferrer">
          <Image
            className={clsx(styles.docs__item__logo, styles.invert__dark)}
            src={`${ASSETS_PREFIX}/next.svg`}
            width={150}
            height={50}
            alt={'Next.js'}
          />
          <div className={styles.docs__item__title}>Next.js</div>
          <div className={styles.docs__item__description}>Next.js docs</div>
        </a>

        <a className={styles.docs__item} href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <Image
            className={clsx(styles.docs__item__logo)}
            src={`${ASSETS_PREFIX}/react.svg`}
            width={150}
            height={50}
            alt={'React.js'}
          />
          <div className={styles.docs__item__title}>React.js</div>
          <div className={styles.docs__item__description}>React.js docs</div>
        </a>

        <a
          className={styles.docs__item}
          href="https://help.metricinsights.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className={clsx(styles.docs__item__logo, styles.invert)}
            src={`${ASSETS_PREFIX}/metricinsights.svg`}
            width={150}
            height={20}
            alt={'MetricInsights'}
          />
          <div className={styles.docs__item__title}>MetricInsights</div>
          <div className={styles.docs__item__description}>Help & Documentation</div>
        </a>
      </div>
    </>
  );
}
