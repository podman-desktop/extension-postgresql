/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { createNodeResolver, flatConfigs as importXConfigs } from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import noNull from 'eslint-plugin-no-null';
import globals from 'globals';

const withoutNodeGlobals = Object.fromEntries(Object.keys(globals.node).map(name => [name, 'off']));

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.config.js',
      '**/__mocks__/**',
      '**/coverage/**',
      'packages/backend/media/**',
      '**/tests/**',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      importXConfigs.recommended,
      importXConfigs.typescript,
      sonarjs.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['packages/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    plugins: { 'no-null': noNull },
    settings: { 'import-x/resolver-next': [createNodeResolver()] },
    rules: {
      eqeqeq: 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-promise-reject-errors': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      'no-null/no-null': 'error',
      semi: ['error', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-extraneous-dependencies': 'error',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-empty-collection': 'off',
      'sonarjs/no-small-switch': 'off',
      'sonarjs/no-commented-code': 'error',
    },
  },
  {
    files: ['packages/frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...withoutNodeGlobals, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-undef': 'off',
    },
  },
]);
