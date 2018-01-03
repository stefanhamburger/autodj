module.exports = {
  extends: 'airbnb',
  env: {
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  rules: {
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-console': 'off',
    'no-else-return': 'off',
    'no-lonely-if': 'off',
    'no-mixed-operators': 'off',
    'no-param-reassign': ['error', { props: false }],
    'spaced-comment': 'off',
    'jsx-a11y/label-has-for': 'off', //not needed if <label> encloses a form element; we don't need to worry about a11y for this project
    'react/jsx-filename-extension': 'off', //.jsx interferes with .mjs extension
    'react/prop-types': 'off', //PropTypes is no longer part of React core
  },
};
