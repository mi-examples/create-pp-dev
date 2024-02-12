import styles from './docs.module.scss';
import clsx from 'clsx';
import reactLogo from '/react.svg';
import ppDevLogo from '/pp-dev.svg';
import metricinsightsLogo from '/metricinsights.svg';

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
          <img className={clsx(styles.docs__item__logo)} src={ppDevLogo} width={150} height={50} alt={'PP Dev'} />
          <div className={styles.docs__item__title}>PP Dev</div>
          <div className={styles.docs__item__description}>PP Dev docs</div>
        </a>

        <a className={styles.docs__item} href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img className={clsx(styles.docs__item__logo)} src={reactLogo} width={150} height={50} alt={'React.js'} />
          <div className={styles.docs__item__title}>React.js</div>
          <div className={styles.docs__item__description}>React.js docs</div>
        </a>

        <a
          className={styles.docs__item}
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className={clsx(styles.docs__item__logo)}
            src={`/typescript.svg`}
            width={150}
            height={50}
            alt={'TypeScript'}
          />
          <div className={styles.docs__item__title}>TypeScript</div>
          <div className={styles.docs__item__description}>TypeScript docs</div>
        </a>

        <a
          className={styles.docs__item}
          href="https://vitejs.dev/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className={clsx(styles.docs__item__logo)}
            src={`/vitejs.svg`}
            width={150}
            height={50}
            alt={'Vite.js'}
          />
          <div className={styles.docs__item__title}>Vite.js</div>
          <div className={styles.docs__item__description}>Vite.js docs</div>
        </a>

        <a
          className={styles.docs__item}
          href="https://help.metricinsights.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className={clsx(styles.docs__item__logo, styles.invert)}
            src={metricinsightsLogo}
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
