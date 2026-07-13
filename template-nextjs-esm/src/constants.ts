import packageJson from '../package.json';

export interface PPVariables {
  // LOGO: string;
  // DATASET_ID: number;
}

export const PP_VARIABLES: PPVariables =
  typeof window !== 'undefined' && typeof window.PP_VARIABLES === 'object'
    ? (window.PP_VARIABLES as PPVariables)
    : ({} as PPVariables);

export const ASSETS_PREFIX = `/pt/${packageJson.name}`;
