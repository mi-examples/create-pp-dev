import { AppProps } from 'next/app';
import type { Page } from '@/globals';
import { Fragment } from 'react';

// this should give a better typing
type Props = AppProps & {
  Component: Page;
};

export default function App({ Component, pageProps }: Props) {
  // adjust accordingly if you disabled a layout rendering option
  const getLayout = Component.getLayout ?? ((page) => page);
  const Layout = Component.layout ?? Fragment;

  return <Layout>{getLayout(<Component {...pageProps} />)}</Layout>;
}
