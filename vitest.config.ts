import { defineConfig } from "vitest/config";

// Store/logic tests run in Node (no DOM needed). Component rendering tests, if
// added later, can switch to jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      // `npm run test:coverage` (v8 provider — works on Windows + macOS, no extra
      // native toolchain). Scopes coverage to the pure-logic modules we unit-test;
      // React components / IPC wiring are exercised by the app, not vitest.
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/main.tsx"],
    },
  },
});
