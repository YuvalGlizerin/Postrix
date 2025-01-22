import js from '@eslint/js';
import eslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.history/**',
      '.git/**',
      'coverage/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      '@typescript-eslint': eslint,
      'import': importPlugin
    },
    rules: {
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'import/order': ['warn', {
        'newlines-between': 'always'
      }],
      'no-debugger': 'error',
      'no-extra-semi': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'camelcase': ['error', {
        'properties': 'never'
      }],
      'curly': ['error', 'all'],
      'yoda': 'error'
    }
  }
]; 