import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest configuration for MedBill.
 * See: docs/16_TESTING_GUIDE.md, ADR-010
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Only measure coverage on pure, testable lib files.
      // Client (store, api) and server (db, auth, audit) modules require
      // complex mocking and are covered by integration/e2e tests instead.
      include: ["src/lib/gst.ts", "src/lib/format.ts", "src/lib/utils.ts", "src/lib/nav.ts"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
