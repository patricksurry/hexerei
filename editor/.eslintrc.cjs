module.exports = {
  extends: '../.eslintrc.cjs',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Disable problematic rules for React + Vite setup
    'import/extensions': 'off', // Vite bundler handles extensions
    'import/no-extraneous-dependencies': 'off', // Dev vs prod deps handled by Vite
    'import/no-unresolved': 'off', // Vite handles module resolution
    'no-use-before-define': 'off', // Hoisting is fine

    // React hooks return complex inferred types - disable unsafe warnings
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // Still catch explicit any usage
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
