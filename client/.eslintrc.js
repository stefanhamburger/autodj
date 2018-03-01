module.exports = {
  env: {
    browser: true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'react/jsx-filename-extension': 'off', //.jsx interferes with .mjs extension
    'react/prop-types': 'off', //PropTypes is no longer part of React core
  },
};
