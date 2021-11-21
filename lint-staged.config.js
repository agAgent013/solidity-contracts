module.exports = {
  '*.{ts,js,tsx,jsx,json,html,yml,sol}': [
    "pretty-quick --pattern '**/*.*(js|tx|jsx|tsx|json|html|yml)' --staged",
  ],
  '**/*.{ts,js,tsx,jsx,json}': 'npm run lint:js:fix',
  '**/*.sol': 'npm run lint:sol:fix',
};
