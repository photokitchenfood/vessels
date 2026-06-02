# PK Props Vessels Catalog — Category Restructure Handoff

## Context

Working through a color-by-color category restructure for the PK Props Vessels Catalog (GitHub: `photokitchenfood/pk-vessels-catalog`). One color per chat. Always fetch `index.html` fresh from the raw GitHub URL at the start of each session — never rely on a locally uploaded or project-folder version.

---

## Master Category List (Final)

| Category | ID Prefix |
|---|---|
| Plates | `-p-` |
| Bowls | `-b-` |
| Ramekins | `-r-` |
| Cups & Mugs | `-cm-` |
| Glasses | `-gl-` |
| Jars & Bottles | `-jb-` |
| Baskets & Trays | `-bt-` |
| Boards & Stands | `-bs-` |
| Pots & Pans | `-pp-` |
| Pitchers & Vases | `-pv-` |
| Containers | `-cn-` |
| Tools & Accessories | `-ta-` |

---

## Deprecated Categories to Clear Out

These are marked ⚠️ in the live catalog sidebar and modal dropdowns:

- **Others** (`-o-`)
- **Lunchbox** (`-lb-`)
- **Cups & Glasses** (`-cg-`)
- **Serving Plates** (`-sp-`) — if present

---

## ID Convention

`[color-prefix]-[category-prefix]-[number]`
e.g. `r-cm-3` = Red, Cups & Mugs, item 3

- Gaps must be closed after moves — last number = item count
- New categories for a color start at 1
- Use two-pass temp ID strategy to avoid collisions during renaming

---

## Per-Session Workflow

1. Paste the raw GitHub URL for the color's JS file — Claude fetches it directly
2. Claude lists all vessels in deprecated categories with suggested destination categories
3. You confirm or correct each move (cross-check visually on the live site)
4. Claude applies all moves + renumbering in one pass, delivers updated JS
5. Replace the file in the repo and push via GitHub Desktop

---

## Raw URL Pattern

```
https://raw.githubusercontent.com/photokitchenfood/pk-vessels-catalog/refs/heads/main/data/[color].js
```

---

## Status

| Color | Restructure |
|---|---|
| 🫧 Clear | ✅ Done |
| 🔴 Red | ✅ Done |
| ⚪ White | ⏳ Pending |
| 🔵 Blue | ⏳ Pending |
| 🟢 Green | ⏳ Pending |
| 🪵 Wood | ⏳ Pending |
| ⚫ Black | ⏳ Pending |
| 🩶 Gray | ⏳ Pending |
| 🪨 Silver | ⏳ Pending |
| 🟡 Gold | ⏳ Pending |
| 🩷 Pink/Purple | ⏳ Pending |
| 🟠 Yellow/Orange | ⏳ Pending |
| 🟤 Beige/Brown | ⏳ Pending |

---

## What Comes After (Phase 2)

Once ALL colors are restructured, do a single final `index.html` update to remove the ⚠️ deprecated category chips and dropdown options. Do not touch `index.html` mid-process.

After that: landing page improvements (banner photo, category guide, auto-updating Last Updated date, color summary with vessel counts, "New!" badge system — driven by a GitHub Actions `data/meta.js` workflow).
