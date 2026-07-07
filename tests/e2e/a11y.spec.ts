import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.1 A/AA scan on the key public pages. Tagged @a11y so it can be run
// on its own (npm run test:a11y). Fails the build on any violation.
const pages: { name: string; path: string }[] = [
  { name: "home", path: "/" },
  { name: "sticks", path: "/sticks" },
  { name: "product", path: "/sticks/elite-senior-stick" },
  { name: "clubs", path: "/clubs" },
  { name: "warranty", path: "/warranty" },
  { name: "cart", path: "/cart" },
];

for (const p of pages) {
  test(`${p.name} has no WCAG A/AA violations @a11y`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Attach a readable summary on failure.
    if (results.violations.length) {
      const summary = results.violations
        .map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s): ${v.help}`)
        .join("\n");
      test.info().annotations.push({ type: "a11y-violations", description: summary });
    }
    expect(results.violations, `a11y violations on ${p.path}`).toEqual([]);
  });
}
