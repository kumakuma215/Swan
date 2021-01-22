module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['noftalint/typescript'],
  ignorePatterns: ['.eslintrc.js', 'node_modules/', 'build/'],
  reportUnusedDisableDirectives: true,
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  rules: {
    // node/file-extension-in-import has too many false positives with .json.
    'node/file-extension-in-import': 'off',
    'import/extensions': ['error', 'never', { ts: 'never' }],

    // @typescript-eslint can't find the .toString() method for these types, but it
    // does exists as it is inherited from the Channel class.
    '@typescript-eslint/no-base-to-string': ['error', {
      ignoredTypeNames: ['TextChannel', 'NewsChannel'],
    }],

    // We don't want to forbid non-null-assertions!
    '@typescript-eslint/no-non-null-assertion': 'off',

    // Because discord.js is promised base, we use a lot of promises in loops/callbacks that needs
    // be resolved before continuing! (i.e to send reactions or messages in the right order).
    '@typescript-eslint/no-misused-promises': 'off',
    'no-await-in-loop': 'off',
  },
};
