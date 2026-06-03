# PK Vessel Uploader — Usage Guide

## What It Is

A standalone Claude artifact (React) for adding new vessels to the PK Props Vessels Catalog. It uses Claude Vision to auto-generate a vessel description and suggest a category from a photo, then outputs a **snippet JS file** containing the new vessel data and photos — ready to be merged into the color JS file via the main catalog chat.

**Repo:** `github.com/photokitchenfood/vessels`

---

## How to Use It

### Step 1 — Load the color JS file

1. Select the correct color from the dropdown in the artifact
2. Click **Get JS File ↗** — this opens the raw GitHub URL for that color's JS file in a new tab
3. Download the file (if it opens as text in the browser, right-click → Save Link As)
4. Drag the downloaded `.js` file into the drop zone, or click to browse

The artifact will confirm how many vessels are loaded and show the filename. The next available vessel ID is shown in the top right of Step 2.

### Step 2 — Add each new vessel

1. Drag or click to upload a vessel photo (JPEG or PNG)
2. Wait a moment — Claude Vision will auto-generate a description and suggest a category (shown with an **auto** badge)
3. Review and edit the description if needed — format is: `[Shape] [Type], [Finish] [Color], [Key Feature], [Secondary Feature]`
4. Confirm or change the category
5. Fill in any known dimensions (D, L, W, H in cm) and quantity
6. Add optional notes if relevant
7. Click **+ Add to Queue**

Repeat for as many vessels as you're adding in this batch. Each vessel is listed in the queue as you go.

### Step 3 — Download the snippet and merge

1. Review the queue — use **edit** or **✕** to adjust or remove any item
2. Click **↓ Download Snippet** — this saves a file named `YYMMDD-[color]-snippet.js`
3. Take the snippet file **and** the original color JS file (the one you loaded in Step 1) to the **main catalog chat**
4. Upload both files and say: *"Merge this snippet into the color JS file and give me the updated file."*
5. Claude will append the new vessels to the correct category and merge the photos into the `IMAGES` object
6. Download the updated JS file and push via GitHub Desktop

---

## What the Snippet Contains

The snippet file has two sections that get merged into the color JS file:

- **`NEW_VESSELS`** — array of vessel objects (id, color, category, name, dimensions) to append into the `vessels` array
- **`NEW_IMAGES`** — object of base64 photo strings keyed by vessel ID, to merge into the `IMAGES` object

Vessels without a photo are included in `NEW_VESSELS` but omitted from `NEW_IMAGES`.

---

## Raw URL Pattern (for reference)

```
https://raw.githubusercontent.com/photokitchenfood/vessels/refs/heads/main/data/[color].js
```

---

## Category Reference

Current valid categories and their ID prefixes:

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

> ⚠️ If the artifact's dropdowns show deprecated categories (Others, Lunchbox, Cups & Glasses, Serving Plates), do not use them. Always pick from the list above.

---

## ID Convention

`[color-prefix]-[category-prefix]-[number]`

The artifact auto-calculates the next available ID based on the loaded JS file. You don't need to set this manually — it's shown in the top right of Step 2 and updates as you add vessels to the queue.

---

## Notes

- Always complete Step 1 before adding vessels — the artifact needs a loaded JS file to calculate correct IDs
- Photos are compressed and converted to JPEG automatically before being sent to Claude Vision
- If auto-describe fails (e.g. API timeout), you can type the description manually and proceed normally
- You can add multiple vessels in one session before downloading — all will be included in a single snippet file
- The snippet file does not replace the color JS file — it must always be merged via the catalog chat
