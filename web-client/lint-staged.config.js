module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'jest --findRelatedTests --passWithNoTests'
  ],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.{css,scss,less}': ['stylelint --fix', 'prettier --write']
}; 