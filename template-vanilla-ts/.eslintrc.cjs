module.exports = {
  env: { browser: true, es2020: true },
  root: true,
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'dist-zip', 'backups', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: true,
        },
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true, fixToUnknown: true }],
    'eol-last': ['error', 'always'],
    'max-statements-per-line': ['error', { max: 3 }],
    'max-len': ['error', 120],
    'no-console': 'error',
    'new-cap': ['error', { newIsCap: true, properties: false, capIsNew: false }],
    'newline-before-return': 'error',
    'key-spacing': ['error', { afterColon: true, mode: 'strict' }],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'max-classes-per-file': ['error', { ignoreExpressions: true }],
  },
};
