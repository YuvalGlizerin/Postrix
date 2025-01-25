import js from '@eslint/js';
import eslint from '@typescript-eslint/eslint-plugin';
import eslintPluginYml from 'eslint-plugin-yml';
import yamlParser from 'yaml-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jsonParser from 'jsonc-eslint-parser';
import jsoncPlugin from 'eslint-plugin-jsonc';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.history/**',
      '.git/**',
      'coverage/**',
      '**/kubernetes/**/templates/**/*.{yml,yaml}'  // Ignore helm files
    ]
  },
  js.configs.recommended,
  ...eslintPluginYml.configs['flat/recommended'],
  {
    files: ['**/*.yml', '**/*.yaml'],
    languageOptions: {
      parser: yamlParser,
      parserOptions: {
        defaultYAMLVersion: '1.2',
        tokens: true
      }
    },
    plugins: {
      yml: eslintPluginYml
    },
    rules: {
      'yml/no-multiple-empty-lines': ['error', { 
        max: 1,
        maxEOF: 0
      }],
      'yml/no-empty-mapping-value': 'off',
      'yml/indent': ['error', 2, {
        indentBlockSequences: true,
        indicatorValueIndent: 2
      }]
    }
  },
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
      'yoda': 'error',
      'no-multiple-empty-lines': ['error', {
        'max': 1,
        'maxEOF': 0
      }],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'never']
    }
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsonParser
    },
    plugins: {
      jsonc: jsoncPlugin
    },
    rules: {
      'indent': ['error', 2],
      'quote-props': ['error', 'always'],
      'quotes': ['error', 'double'],
      'jsonc/comma-dangle': ['error', 'never'],  // Using jsonc specific rule
      'no-multiple-empty-lines': ['error', {
        'max': 0,
        'maxEOF': 0
      }],
      'semi': ['error', 'never']
    }
  }
];
