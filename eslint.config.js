import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Who may import whom (ENGINEERING_SPEC §1). A skin reaching into core, or a shared screen
// reaching into one skin, is how the second skin stops being a contained piece of work.
const notFromCore = [
  { group: ['preact', 'preact/*', '@preact/*', 'preact-iso'], message: 'core/ is plain maths: no UI.' },
  { regex: '(^|/)(lib|ui|screens|skins|styles|games)(/|$)', message: 'core/ imports only core/.' },
];
const notIntoASkin = [
  { regex: 'skins/(?!index$)', message: 'Shared code reaches skins only through skins/index.' },
];
// A game is a canvas and its rules: the screen hosting it hands in numbers and colours.
const notFromAGame = [
  { group: ['preact', 'preact/*', '@preact/*', 'preact-iso'], message: 'games/ draw to a canvas: no UI.' },
  { regex: '(^|/)(lib|ui|screens|skins|styles)(/|$)', message: 'games/ import only core/ and games/.' },
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.wrangler', '.claude', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['src/core/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: notFromCore }] },
  },
  {
    files: ['src/games/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: notFromAGame }] },
  },
  {
    files: ['src/ui/**', 'src/screens/**', 'src/lib/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: notIntoASkin }] },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      // The ux scripts run in Node and pass callbacks into the page.
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
