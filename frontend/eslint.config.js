import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*'], message: 'Shared layer must not depend on app layer.' },
            { group: ['@/pages/*'], message: 'Shared layer must not depend on pages layer.' },
            { group: ['@/widgets/*'], message: 'Shared layer must not depend on widgets layer.' },
            { group: ['@/features/*'], message: 'Shared layer must not depend on features layer.' },
            { group: ['@/entities/*'], message: 'Shared layer must not depend on entities layer.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*'], message: 'Entities layer must not depend on app layer.' },
            { group: ['@/pages/*'], message: 'Entities layer must not depend on pages layer.' },
            { group: ['@/widgets/*'], message: 'Entities layer must not depend on widgets layer.' },
            { group: ['@/features/*'], message: 'Entities layer must not depend on features layer.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*'], message: 'Features layer must not depend on app layer.' },
            { group: ['@/pages/*'], message: 'Features layer must not depend on pages layer.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/pages/*'], message: 'Widgets layer must not depend on pages layer.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*'], message: 'Pages layer must not depend on app layer.' },
          ],
        },
      ],
    },
  },
])
