module.exports = {
  extends: ['../.eslintrc.cjs', 'airbnb-typescript/base'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/indent': 'off', // Prettier handles this
    '@typescript-eslint/comma-dangle': 'off', // Prettier handles this
    '@typescript-eslint/no-use-before-define': 'off', // Hoisting is fine
  },
};
