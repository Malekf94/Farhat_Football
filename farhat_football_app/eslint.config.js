import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Warning policy (QA-001): errors must be zero — `npm run lint` fails on any.
// Warnings are capped at the count that existed when the backend was brought
// under lint (`--max-warnings 5` in package.json), so the number can only go
// down. Fixing one means lowering the cap in the same change; a new warning
// fails the build. The five held over are structural — three
// react-refresh/only-export-components and two react-hooks/exhaustive-deps —
// and each needs a real refactor rather than a lint edit.
export default [
  { ignores: ['dist'] },
  {
    // The Express API. These are CommonJS and run in Node, so they get neither
    // browser globals nor the React plugins — only the recommended core rules.
    // Without this block `eslint .` matched **/*.{js,jsx} and silently skipped
    // every route, guard and payment query in the backend.
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Express identifies an error handler by ARITY: a middleware receives
      // errors only if it declares four parameters. `next` in the handler at
      // server.cjs is therefore load-bearing while unused, and deleting it to
      // satisfy no-unused-vars would silently demote the handler to ordinary
      // middleware and stop errors being handled at all.
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$|^_' }],
    },
  },
  {
    // Everything under tests/ runs in Node, not the browser.
    files: ['tests/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
