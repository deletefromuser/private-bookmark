import js from '@eslint/js';
import globals from 'globals';

const browserGlobals = {
  ...globals.browser,
  ...globals.webextensions,
  db: 'readonly',
  _modal: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/wa-sqlite/**', 'package-lock.json'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/background.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['eslint.config.mjs', 'test/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
