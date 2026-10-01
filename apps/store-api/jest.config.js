module.exports = {
  displayName: 'store-api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  detectOpenHandles: false,     // no bloquea el CI
  forceExit: true,               // fuerza salida tras los tests
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/store-api',
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|@ecommerce)/)',
  ],
  // ✅ AÑADIR:
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/**/dto/**',
    '!src/**/*.controller.ts',        // ← controllers van en integration tests
    '!src/**/*.config.ts',             // ← config no se testea
    '!src/**/cronjobs/**',             // ← cronjobs van aparte
    '!src/**/*.entity.ts',             // ← entidades son datos puros
    '!src/**/strategies/**',           // ← estrategias van con auth
    '!src/**/guards/**',               // ← guards van con auth
    '!src/**/decorators/**',           // ← decoradores van con auth
    '!src/**/interceptors/**',         // ← interceptores van con auth
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