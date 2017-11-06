module.exports = {
    'extends': 'airbnb-base',
    'env': {
        'browser': true,
    },
    'parserOptions': {
        'ecmaVersion': 2017,
        'sourceType': 'module',
    },
    'rules': {
        'indent': [
            'error',
            4,
            { 'SwitchCase': 1 }
        ],
        'linebreak-style': [
            'error',
            'windows'
        ],
        'max-len': ['off'],
        'no-bitwise': ['off'],
        'no-console': ['off'],
        'no-else-return': ['off'],
        'no-lonely-if': ['off'],
        'no-mixed-operators': ['off'],
        'no-plusplus': ['off'],
        'no-undef': ['warn'],
        'no-unused-vars': ['warn'],
        'prefer-template': ['off'],
        'spaced-comment': ['off'],
    },
};
