module.exports = {
  extends: ['../.eslintrc.cjs', 'airbnb-typescript/base'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // D3 uses complex inferred types - disable unsafe warnings
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',

    // Still catch explicit any
    '@typescript-eslint/no-explicit-any': 'warn',

    // Allow unnamed functions for D3 event handlers
    'func-names': 'off',

    // Prettier handles formatting
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/comma-dangle': 'off',
  },
};
