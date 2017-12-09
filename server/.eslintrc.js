module.exports = {
  'extends': 'airbnb-base',
  'env': {
    'node': true,
  },
  'parserOptions': {
    'ecmaVersion': 2017,
    'sourceType': 'module',
  },
  'rules': {
    'max-len': ['off'],
    'no-bitwise': ['off'],
    'no-console': ['off'],
    'no-else-return': ['off'],
    'no-lonely-if': ['off'],
    'no-mixed-operators': ['off'],
    'no-param-reassign': ['error', { 'props': false }],
    'no-undef': ['warn'],
    'no-unused-vars': ['warn'],
    'spaced-comment': ['off'],
  },
};
