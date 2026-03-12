const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');

const { fixupConfigRules } = require('@eslint/compat');

const stylistic = require('@stylistic/eslint-plugin');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },

    extends: fixupConfigRules(compat.extends('eslint:recommended')),

    plugins: {
      '@stylistic': stylistic,
    },

    rules: {
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
  globalIgnores(['**/dist', '**/dist-zip', '**/backups', '**/.eslintrc.cjs', '**/eslint.config.cjs', '**/.prettierrc.cjs']),
]);
