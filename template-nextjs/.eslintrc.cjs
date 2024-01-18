module.exports = {
  extends: ['next'],
  root: true,
  env: { browser: true, es2020: true },
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  plugins: ['@typescript-eslint'],
  parserOptions: { ecmaVersion: 'latest', project: './tsconfig.json', sourceType: 'module' },
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
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.cts', '*.mts'], // Your TypeScript files extension

      // As mentioned in the comments, you should extend TypeScript plugins here,
      // instead of extending them outside the `overrides`.
      // If you don't want to extend any rules, you don't need an `extends` attribute.
      extends: [
        'next',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],

      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
        ],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true, fixToUnknown: true }],
      },

      parserOptions: {
        project: ['./tsconfig.json'], // Specify it only for TypeScript files
      },
    },
  ],
};
