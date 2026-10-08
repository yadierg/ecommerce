module.exports = {
  displayName: 'admin-api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  detectOpenHandles: false,     // no bloquea el CI
  forceExit: true,               // fuerza salida tras los tests
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/admin-api',
  transformIgnorePatterns: ['node_modules/(?!(@nestjs|@ecommerce)/)'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/**/dto/**',
    '!src/**/*.controller.ts',
    '!src/**/*.config.ts',
    '!src/**/cronjobs/**',
    '!src/**/*.entity.ts',
    '!src/**/strategies/**',
    '!src/**/guards/**',
    '!src/**/decorators/**',
    '!src/**/interceptors/**',
    '!src/**/*.seeder.ts',
  ],
  coverageReporters: ['text-summary', 'html', 'lcov', 'json-summary', 'text'],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
    },
  },
};