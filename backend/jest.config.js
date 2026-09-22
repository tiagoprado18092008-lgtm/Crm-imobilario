module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },

  /**
   * Baileys ships as ESM and Jest does not transform node_modules, so any test
   * whose import chain reaches the WhatsApp socket failed to parse before it
   * ran a single assertion. No test needs a real socket, so it is stubbed.
   */
  moduleNameMapper: {
    '^@whiskeysockets/baileys$': '<rootDir>/src/__mocks__/baileys.ts',
  },

  testTimeout: 15000,
};
