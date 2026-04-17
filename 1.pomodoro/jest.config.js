/**
 * Jest 設定ファイル
 * ポモドーロタイマー用のテスト環境設定
 */

export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
  collectCoverageFrom: [
    'static/js/**/*.js',
    '!static/js/app.js',
    '!static/js/presentation/view.js',
    '!static/js/infrastructure/notifier.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
