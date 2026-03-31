/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/e2e/**/*.test.ts"],
  testTimeout: 60000,
  globalSetup: __dirname + "/global-setup.ts",
};
module.exports = config;
