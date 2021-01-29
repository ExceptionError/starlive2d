module.exports = {
  root: true,
  files :['./src/*'],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  'rules': {
    'import/order': [
      'warn',
      {
        'alphabetize': { 'order': 'asc' },
        'newlines-between': 'always'
      }
    ]
  }
};
