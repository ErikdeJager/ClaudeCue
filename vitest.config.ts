import { defineConfig } from "vitest/config";

// Store/logic tests run in Node (no DOM needed). Component rendering tests, if
// added later, can switch to jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
