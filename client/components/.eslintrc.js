module.exports = {
  env: {
    browser: true,
  },
  rules: {
    //we don't need to worry about a11y for this project
    'jsx-a11y/label-has-for': 'off', //our <label>s always enclose a form element
    'jsx-a11y/accessible-emoji': 'off', //adding a title to the volume button would interfere with :hover slider
  },
};
