const { globals } = require('jest-preset-angular/jest-preset.js');

module.exports = {
  globals,
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/projects/ng-observe/setup-jest.ts'],
};
