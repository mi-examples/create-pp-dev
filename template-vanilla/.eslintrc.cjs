module.exports = {
  env: { browser: true, es2020: true },
  root: true,
  extends: ['eslint:recommended'],
  // parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  // plugins: ['@typescript-eslint'],
  rules: {
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
