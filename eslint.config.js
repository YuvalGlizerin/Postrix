import eslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.history/**',
      '.git/**',
      'coverage/**'
    ],
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': eslint
    },
    rules: {
      'quotes': ['error', 'single'],
      'semi': ['error', 'always']
    }
  }
]; 