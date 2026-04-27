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
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/components/auth/RegisterFormShell.tsx",
    "src/components/hr/HRStats.tsx",
    "src/components/jobs/ApplicationCard.tsx",
    "src/components/jobs/JobCard.tsx",
    "src/components/jobs/JobFilters.tsx",
    "src/components/shared/ErrorAlert.tsx",
    "src/components/shared/LoadingSpinner.tsx",
    "src/components/ui/FormField.tsx",
    "src/components/ui/StatusBadge.tsx",
    "src/middleware.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text-summary"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  coveragePathIgnorePatterns: [],
};

module.exports = createJestConfig(customJestConfig);