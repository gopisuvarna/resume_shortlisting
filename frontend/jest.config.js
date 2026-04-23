const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/components/shared/ErrorAlert.tsx",
    "src/components/shared/LoadingSpinner.tsx",
    "src/components/ui/FormField.tsx",
    "src/components/ui/StatusBadge.tsx",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text-summary"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
