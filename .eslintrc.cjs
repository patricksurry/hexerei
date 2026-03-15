module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // Strict typing enforcement - errors for new code
    '@typescript-eslint/no-explicit-any': 'warn', // TODO: Make error after cleanup
    '@typescript-eslint/no-unsafe-assignment': 'warn', // TODO: Make error after cleanup
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off', // Too noisy for now

    // Import rules
    'import/prefer-default-export': 'off',
    'import/extensions': ['error', 'ignorePackages', {
      ts: 'never',
      tsx: 'never',
    }],
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.test.ts', '**/*.test.tsx', '**/test-*.ts', '**/*.config.ts'],
    }],

    // Allow for-of loops (Airbnb disables by default)
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement',
    ],

    // Airbnb style overrides for this codebase
    'no-underscore-dangle': 'off', // We use private fields
    'no-plusplus': 'off', // Common in loops
    'no-continue': 'off', // Useful for early loop exits
    'no-bitwise': 'off', // Used in hex math
    'radix': 'off', // parseInt defaults are fine
    'no-param-reassign': 'off', // Sometimes necessary
    'no-nested-ternary': 'off', // Can be readable
    'class-methods-use-this': 'off', // Interface consistency matters
    'no-cond-assign': 'off', // Useful pattern in parsers
    'default-case': 'off', // TypeScript exhaustiveness checks are better
    'no-case-declarations': 'off', // Block scoping is clear enough
    'no-restricted-globals': 'off', // We know what we're doing with isNaN

    // Console usage
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // TypeScript handles these
    'consistent-return': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/naming-convention': 'off', // Too restrictive
    '@typescript-eslint/lines-between-class-members': 'off', // Compact classes ok
    '@typescript-eslint/dot-notation': 'off', // Sometimes bracket notation is clearer
    '@typescript-eslint/no-redundant-type-constituents': 'off', // Can be intentional
    '@typescript-eslint/no-use-before-define': 'off', // Hoisting is fine
    '@typescript-eslint/comma-dangle': 'off', // Prettier handles this
  },
  overrides: [
    {
      // Test files - disable type-aware linting since tests are excluded from tsconfig
      files: ['**/*.test.ts', '**/*.test.tsx', '**/test-*.ts'],
      parserOptions: {
        project: null,
      },
      extends: [
        'airbnb-base',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        'import/no-extraneous-dependencies': ['error', {
          devDependencies: true,
        }],
      },
    },
    {
      // React files (editor package)
      files: ['editor/**/*.tsx', 'editor/**/*.ts'],
      extends: [
        'airbnb',
        'airbnb-typescript',
        'airbnb/hooks',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './editor/tsconfig.json',
      },
      env: {
        browser: true,
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
        'react/function-component-definition': ['error', {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        }],
      },
    },
  ],
};
