/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// logError is dev-only noise in tests; failures are asserted explicitly.
jest.spyOn(console, 'warn').mockImplementation(() => undefined);
