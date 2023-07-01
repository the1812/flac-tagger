module.exports = {
  extends: ['@the1812/eslint-config'],
  rules: {
    'no-bitwise': 'off',
    'class-methods-use-this': 'off',
  },
  overrides: [
    {
      files: ['test/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
}
