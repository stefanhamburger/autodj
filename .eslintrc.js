module.exports = {
  root: true,
  extends: 'airbnb',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
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
  },
};
