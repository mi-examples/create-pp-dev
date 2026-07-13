const { defineConfig, globalIgnores } = require('eslint/config');

const nextVitals = require('eslint-config-next/core-web-vitals');

const stylistic = require('@stylistic/eslint-plugin');

module.exports = defineConfig([
  ...nextVitals,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
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
      curly: ['error', 'all'],
      '@stylistic/curly-newline': ['error', 'always'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: 'block', next: '*' },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: '*', next: 'for' },
        { blankLine: 'always', prev: '*', next: 'while' },
        { blankLine: 'always', prev: '*', next: 'switch' },
        { blankLine: 'always', prev: '*', next: 'try' },
        { blankLine: 'any', prev: 'expression', next: 'expression' },
      ],
      'key-spacing': ['error', { afterColon: true, mode: 'strict' }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'max-classes-per-file': ['error', { ignoreExpressions: true }],
    },
  },
  globalIgnores([
    '**/dist',
    '**/dist-zip',
    '**/backups',
    '**/.eslintrc.cjs',
    '**/eslint.config.cjs',
    '**/.prettierrc.cjs',
  ]),
]);
