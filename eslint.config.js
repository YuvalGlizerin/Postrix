import js from '@eslint/js';
import eslint from '@typescript-eslint/eslint-plugin';
import eslintPluginYml from 'eslint-plugin-yml';
import yamlParser from 'yaml-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jsonParser from 'jsonc-eslint-parser';
import jsoncPlugin from 'eslint-plugin-jsonc';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.history/**',
      '**/.git/**',
      '**/coverage/**',
      '**/kubernetes/**/templates/**/*.{yml,yaml}', // Ignore helm files
      '**/prisma/migrations/**', // Ignore prisma migration files
      '**/src/generated/**', // Ignore generated prisma client
      // Next.js specific ignores
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/next-env.d.ts'
    ]
  },
  js.configs.recommended,
  ...eslintPluginYml.configs['flat/recommended'],
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.yml', '**/*.yaml'],
    languageOptions: {
      parser: yamlParser,
      parserOptions: {
        defaultYAMLVersion: '1.2',
        tokens: true
      }
    },
    plugins: { yml: eslintPluginYml },
    rules: {
      'yml/no-multiple-empty-lines': [
        'error',
        {
          max: 1,
          maxEOF: 0
        }
      ],
      'yml/no-empty-mapping-value': 'off',
      'yml/indent': [
        'error',
        2,
        {
          indentBlockSequences: true,
          indicatorValueIndent: 2
        }
      ]
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
      import: importPlugin,
      prettier: prettier
    },
    rules: {
      ...eslint.configs['recommended'].rules,
      'import/order': ['warn', { 'newlines-between': 'always' }],
      'import/no-extraneous-dependencies': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      camelcase: ['error', { properties: 'never' }],
      curly: ['error', 'all'],
      'prettier/prettier': [
        'error',
        {
          printWidth: 120,
          tabWidth: 2,
          singleQuote: true,
          trailingComma: 'none',
          bracketSpacing: true,
          semi: true,
          useTabs: false,
          arrowParens: 'avoid',
          endOfLine: 'auto'
        }
      ]
    }
  },
  {
    files: ['**/*.json'],
    languageOptions: { parser: jsonParser },
    plugins: { jsonc: jsoncPlugin },
    rules: {
      ...jsoncPlugin.configs['flat/recommended'],
      'jsonc/indent': [
        'error',
        2,
        {
          SwitchCase: 1,
          ignoredNodes: [],
          ArrayExpression: 1,
          ObjectExpression: 1
        }
      ],
      'jsonc/comma-dangle': ['error', 'never'],
      'no-multiple-empty-lines': [
        'error',
        {
          max: 0,
          maxEOF: 0
        }
      ]
    }
  }
];

export default config;
