import { NextPage } from 'next';
import { ComponentType, ReactElement, ReactNode } from 'react';

declare global {
  interface Window {
    PP_VARIABLES?: Record<string, unknown>;
  }
}

export type Page<P = Record<number | string, unknown>> = NextPage<P> & {
  // You can disable whichever you don't need
  getLayout?: (page: ReactElement) => ReactNode;
  layout?: ComponentType;
};
