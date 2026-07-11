# System Design — Stick-First Options Admin

**Goal:** manage all stick options (flex, curve, size, color, hand…) from `/admin` instead of hardcode. Admin reads at the *stick level* (Senior / Int / Jr / Youth sections, attributes as columns), with multi-select so one value can apply to many sticks at once.

---

## 1. Current state (what already exists)

Most of the backend is already built — worth knowing before adding anything.

- **`OptionValue`** table: `kind` (FLEX/CURVE/HAND/COLOR/LENGTH/PADDLE), `value`, `label`, `sizing` (SENIOR/INT/JR/YTH/**ALL**), `category` (FULL_STICK/GOALIE/**ALL**), `upchargeCents`, `isDefault`, `sortOrder`, `active`.
- **`AttributeKind` / `SizingTier` / `Category`**: admin-editable catalogs (no migration to add a new attribute or tier).
- **`lib/options.ts` → `withDbOptions()`**: reads `OptionValue`, scopes by tier + category, builds the configurator matrix live. 15s cache. Falls back to static `catalog.ts` only if the DB is empty.
- **`lib/catalog.ts`** (`FLEX_SENIOR = [...]`, etc.): **now only a seed/offline fallback**, not the live source.

So "options live in admin" is already true at the data layer. Three real gaps remain:

1. **Admin UX is attribute-first**, not stick-first. `AdminOptions` groups by kind → one table per FLEX, CURVE, COLOR… You want one section per *tier*, attributes as columns.
2. **No bulk/multi-select add.** Each `OptionValue` is one (kind, value, sizing, category) row. "This curve applies to Senior + Int" = two manual rows today. `sizing="ALL"` covers "colors apply to everything," but you can't pick *"Senior and Int only"* in one action.
3. **`catalog.ts` still hardcodes** the flex/curve sets. It's a fallback, but it drifts from the DB and must be hand-kept in sync.

---

## 2. The one real decision: shared-per-tier vs per-stick options

Your words point two directions at once:

- *"colors apply to all sticks, curves are the same for Senior and Int"* → **shared, scoped by tier** (the current model).
- *"add a stick… multi-select all your options for THIS stick"* → **per-product** option sets.

These are different models. Recommendation: **keep the shared/scoped model as the default, add per-product override only where a stick genuinely differs.** Reasons:

- Today every Senior full-stick shares the same options and that's correct — pricing/validation all key off tier + category. A pure per-product model would make you re-pick 8 flexes + 8 curves + 9 colors for every new stick. That's the opposite of "as simple as possible."
- 95% of "add a stick" = pick category + tier, options are inherited automatically. Zero option clicks.
- The rare exception (one stick with a shorter curve list) is handled by an optional override, not by making everyone do more work.

**Verdict: Phase 1 = scoped model + stick-first matrix UI + multi-tier bulk add. Phase 2 (optional) = per-product override.** Ship Phase 1 first; it likely covers everything you described.

---

## 3. Data model changes

### Phase 1 — none required to the schema.

The `OptionValue(sizing, category)` scoping already expresses "Senior only / all tiers / goalie only." The work is UI + a bulk-write API.

### Phase 2 (only if a stick must diverge) — add a per-product override:

```prisma
model ProductOption {
  id            String  @id @default(cuid())
  productId     String
  product       Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  optionValueId String
  optionValue   OptionValue @relation(fields: [optionValueId], references: [id], onDelete: Cascade)
  @@unique([productId, optionValueId])
}
```

Resolution rule in `withDbOptions`: **if a product has any `ProductOption` rows for a kind, use those; else fall back to the tier/category-scoped `OptionValue` set.** Override is opt-in per attribute, so a stick can override just its curves and inherit everything else.

---

## 4. Admin UX redesign (the main ask)

Replace attribute-first `AdminOptions` with a **tier-first matrix**. One panel per active `SizingTier` (+ a Goalie/other-category panel). Inside each panel, attributes are columns; values are chips in the cell.

```
┌─ SENIOR ─────────────────────────────────────────────────────────┐
│  FLEX          CURVE         COLOR          HAND      LENGTH       │
│  [65][70][75]  [P92][P28]    [Black][Red]   [R][L]    [57"][60"]   │
│  [80][85][90]  [P88][P90TM]  [Navy][Green]  ...       [63"]        │
│  [95][102]+    ...+          ...+                                  │
├───────────────────────────────────────────────────────────────────┤
│  Chip = one OptionValue. Click = edit (upcharge, default ★, hide). │
│  Greyed chip w/ "ALL" badge = inherited (scope=ALL). Edit once,    │
│  changes everywhere.                                               │
└───────────────────────────────────────────────────────────────────┘
```

Reading model = exactly what you described: **each stick tier is a table, attributes are the columns, values fill the rows.** A value scoped `ALL` shows (greyed, "ALL" badge) in every tier panel so you see the full picture, but edits once.

**Add value flow (multi-select):** one "+ Add value" form:

- Attribute: `[Flex ▾]`
- Value: `[ 80 ]`  Upcharge: `[ $0 ]`  ☐ default
- **Applies to (multi-select tiers):** `☑ Senior  ☑ Int  ☐ Jr  ☐ Youth`  ·  or `● All tiers`
- **Category:** `● All  ○ Full stick  ○ Goalie`

Picking Senior + Int writes two `OptionValue` rows in one call — "curve same for Senior and Int" in one action. Picking "All tiers" writes a single `sizing="ALL"` row — "colors apply to all sticks."

### API: extend the existing `/api/admin/options` POST

Accept a `sizings: string[]` array on create and fan out to N rows (idempotent via the existing `kind_value_sizing_category` upsert):

```ts
// create branch, new shape:
const sizings: string[] = Array.isArray(b.sizings) && b.sizings.length
  ? b.sizings.filter(s => SIZINGS.includes(String(s)))
  : ["ALL"];
for (const sizing of sizings) {
  await prisma.optionValue.upsert({
    where: { kind_value_sizing_category: { kind, value, sizing, category } },
    update: { active: true, upchargeCents },
    create: { kind, value, sizing, category, upchargeCents, label, sortOrder },
  });
}
invalidateOptionCache();
```

Single-value edits (upcharge, default, hide) keep the current `id`-based patch path unchanged.

---

## 5. "Add a stick" flow

`AdminProducts` already creates a `Product` (name, category, sizingTier, price, `configurable`). To finish the loop:

1. On create with `type=PREORDER` + `configurable=true`, options are **auto-derived** from the tier/category `OptionValue` sets — no per-stick option picking needed. This is the "as simple as possible" default.
2. (Phase 2) A "Customize options for this stick" toggle reveals the same matrix, pre-checked to the inherited set; unchecking/adding writes `ProductOption` overrides.

---

## 6. Kill the hardcode

`catalog.ts` flex/curve/color arrays should stop being a parallel source of truth:

- Keep `catalog.ts` as the **seed input only** (`prisma/seed.mjs` already mirrors it) and as the last-resort offline fallback.
- Add a check (script or `npm run verify:catalog`) that fails if seed constants and live `OptionValue` rows diverge, so the fallback can't silently rot.
- Long term, generate the fallback from a DB snapshot at build instead of hand-maintaining it.

---

## 7. Phased plan

| Phase | Work | Ships |
|---|---|---|
| **1a** | Bulk `sizings[]` in options API + invalidate cache | ~½ day |
| **1b** | Tier-first matrix `AdminOptions` rewrite (chips, inherited badge, multi-tier add form) | ~1–2 days |
| **1c** | Auto-derive options on preorder product create; drop any remaining hardcoded reads from live paths | ~½ day |
| **2** *(optional)* | `ProductOption` model + override toggle in Add-a-stick + resolution rule in `withDbOptions` | ~1–2 days |

Phase 1 alone delivers everything in your message except giving *one specific stick* a divergent option list. Do 2 only if that case shows up.

---

## 8. Trade-offs

- **Scoped-shared (chosen) vs per-product-first:** shared keeps "add a stick" to two clicks and matches how pricing/validation already work; cost is that a one-off divergent stick needs the Phase-2 override. Per-product-first is more flexible but multiplies admin effort for the 95% case — wrong default for a one-person shop.
- **`sizing="ALL"` sentinel vs join table:** ALL is a cheap "applies everywhere" already wired into the unique index and resolver. Multi-tier bulk-add writes explicit per-tier rows instead of a group entity — simpler, but "these 3 share a value" isn't a first-class object (editing the value still means touching 3 rows, or scoping it ALL). Acceptable at this catalog size (tens of values).
- **Matrix UI vs current tables:** matrix is the readable view you asked for but is more front-end code and needs an "inherited (ALL)" affordance so shared values aren't edited in the wrong place. Worth it.
- **Fallback drift:** keeping `catalog.ts` as fallback avoids a dark storefront on DB failure but is a second source of truth; mitigate with the divergence check, don't delete it outright.

**Revisit when:** catalog grows past ~a few hundred values (consider a real option-group entity), or when >20% of sticks need per-product overrides (flip the default to per-product).
