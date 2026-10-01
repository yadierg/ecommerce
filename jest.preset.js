const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  setupFilesAfterEnv: [
    ...(nxPreset.setupFilesAfterEnv || []),
    '<rootDir>/../../tools/jest/setup-after-env.ts',  // ← .ts
  ],
  forceExit: true,
  detectOpenHandles: false,
  openHandlesTimeout: 2000,
  testTimeout: 15000,
};