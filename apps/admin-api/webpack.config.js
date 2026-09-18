// apps/admin-api/webpack.config.js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../dist'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      // ❌ ELIMINAR la línea 'assets' si existe
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};