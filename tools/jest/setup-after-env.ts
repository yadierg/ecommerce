/// <reference types="node" />
/// <reference types="jest" />

afterAll(() => {
  if (typeof jest !== 'undefined') {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (jest.restoreAllMocks) {
      jest.restoreAllMocks();
    }
  }
});