module.exports = {
  env: {
    node: true,
  },
  rules: {
    'no-console': 'error', //Forbid console since we use stdin/stdout for passing messages
  },
};
