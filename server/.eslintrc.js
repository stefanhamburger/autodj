module.exports = {
  extends: 'airbnb',
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-console': 'off',
    'no-else-return': 'off',
    'no-lonely-if': 'off',
    'no-mixed-operators': 'off',
    'no-param-reassign': ['error', { 'props': false }],
    'spaced-comment': 'off',
    'react/jsx-filename-extension': 'off', //.jsx interferes with .mjs extension
    'react/prop-types': 'off', //PropTypes is no longer part of React core
  },
};
