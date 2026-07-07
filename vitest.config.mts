import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Two projects share one runner:
//   unit — pure logic in lib/, no I/O, no mocks needed beyond prisma stub
//   api  — route handlers in app/api/**, Prisma + Clover mocked
// Both run in the node environment (these paths never touch the DOM).
export default defineConfig({
  // vite-tsconfig-paths matches each imported file against whichever
  // tsconfig's own `include` covers it — the two aren't merged, so both
  // need to be listed explicitly (setting `projects` disables the
  // plugin's directory-crawling auto-discovery entirely, so leaving either
  // one out means files it's meant to cover silently stop resolving `@/*`):
  //   - tsconfig.json: everything except tests/ (app/**, lib/**, components/**)
  //   - tsconfig.test.json: tests/** (extends root for the `@/*` mapping,
  //     but its own `include` replaces root's rather than adding to it —
  //     that's why tests/ needs its own entry here at all)
  plugins: [tsconfigPaths({ projects: ["tsconfig.json", "tsconfig.test.json"] })],
  // Tests never import CSS. Without this, Vite auto-discovers
  // postcss.config.mjs and chokes on it: that file uses Tailwind's
  // documented Next.js format (`plugins: ["@tailwindcss/postcss"]`,
  // plugin names as strings, resolved by Next's own postcss-loader) but
  // Vite's lightweight loader expects actual plugin instances, not
  // strings. Leave the real postcss.config.mjs untouched for the Next.js
  // build and just skip postcss discovery for the test run.
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.test.ts"],
          setupFiles: ["tests/api/setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.d.ts", "lib/db.ts"],
      thresholds: {
        // Business logic must stay well-covered; routes a bit lower because
        // some branches only fire on real network/DB faults.
        "lib/catalog.ts": { statements: 95, branches: 90, functions: 100, lines: 95 },
        "lib/coupons.ts": { statements: 90, branches: 85, functions: 100, lines: 90 },
      },
    },
  },
});
