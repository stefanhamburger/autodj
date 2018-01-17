module.exports = {
  env: {
    browser: true,
  },
  rules: {
    'jsx-a11y/label-has-for': 'off', //we don't need to worry about a11y for this project (our <label>s always enclose a form element)
  },
};
