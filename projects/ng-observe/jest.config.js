const { globals } = require('jest-preset-angular/jest-preset.js');

module.exports = {
  globals: {
    ...globals,
    'ts-jest': {
      ...globals['ts-jest'],
      tsconfig: '<rootDir>/projects/ng-observe/tsconfig.spec.json',
    },
  },
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/projects/ng-observe/setup-jest.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/projects/ng-observe/package.json'],
};
