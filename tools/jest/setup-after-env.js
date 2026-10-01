// tools/jest/setup-after-env.js
afterAll(() => {
  if (typeof jest !== 'undefined') {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (jest.restoreAllMocks) {
      jest.restoreAllMocks();
    }
  }
});