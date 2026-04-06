# OPR Terrain Guidelines Documentation

## Overview

The OPR Terrain Layout app now includes real-time validation and insights based on the official **OPR Age of Fantasy** terrain setup recommendations. This feature helps ensure your battlefield layouts are balanced and competitive.

## Guidelines Reference

The following guidelines are implemented based on the OPR Age of Fantasy rulebook (`docs/opr-age-of-fantasy-rules.pdf`) and competitive wargaming best practices:

### 1. Terrain Density

**Target:** 20-40% table coverage (30% optimal)

- **What it measures:** The percentage of the table surface covered by terrain pieces
- **Why it matters:** Too little terrain makes the game a shooting gallery; too much slows gameplay and limits movement
- **Recommendations:**
  - Below 20%: Add 2-3 more terrain pieces
  - Above 40%: Consider removing some terrain to avoid overcrowding

### 2. Line of Sight (LoS) Blockers

**Target:** 4-6 pieces for a standard 48"×48" table

- **What it measures:** Number of terrain pieces that completely block line of sight
- **Why it matters:** LoS blocking terrain creates tactical depth and prevents ranged units from dominating
- **Recommendations:**
  - Below 4: Add more LoS Blocking terrain for tactical depth
  - Above 6: May slow down the game excessively

### 3. Cover Balance

**Target:** 30-70% light cover ratio (50% optimal)

- **What it measures:** The ratio of Light Cover to total cover pieces (Light + Heavy)
- **Why it matters:** A mix of cover types creates tactical variety and positioning decisions
- **Recommendations:**
  - Below 30%: Add more Light Cover pieces
  - Above 70%: Add more Heavy Cover pieces
  - Aim for approximately 50/50 balance

### 4. Deployment Zone Clarity

**Target:** 0-2 pieces maximum in deployment zones

- **What it measures:** Number of terrain pieces within deployment zones (typically 12" from table edges)
- **Why it matters:** Clear deployment zones allow proper army setup without frustrating placement restrictions
- **Recommendations:**
  - Above 2 pieces: Move terrain away from deployment zones

### 5. Center Table Balance

**Target:** 1-3 pieces within center 12" circle

- **What it measures:** Number of terrain pieces near the table center
- **Why it matters:** Center terrain creates contested objectives and prevents the middle from being a barren no-man's land
- **Recommendations:**
  - Below 1: Add 1-2 pieces near center for objective play
  - Above 3: Center may be too congested—consider repositioning

## Validation Statuses

The system uses three validation statuses for each guideline:

- **✓ Good** (Green): Within recommended range—no action needed
- **⚠ Warning** (Amber): Approaching limits—consider adjustments
- **✗ Poor** (Red): Outside recommended range—action suggested

## Overall Setup Quality Score

The app calculates an overall score (0-100) based on all validation results:

- **80-100: Excellent** — Tournament-ready setup
- **60-79: Good** — Solid competitive layout
- **40-59: Fair** — Playable but could use improvements
- **0-39: Needs Work** — Significant rebalancing recommended

## How to Use

1. **Build your layout** — Add and position terrain pieces on the table
2. **Check the insights panel** — Review real-time validation feedback
3. **Follow suggestions** — Address any warnings or poor ratings
4. **Iterate** — Drag pieces around and watch the metrics update live
5. **Save or share** — Once satisfied, save the layout or share the URL

## Important Notes

### Guidelines are Suggestions, Not Rules

These recommendations are based on competitive play standards but should be adapted to:

- Your army composition
- Mission objectives
- Play group preferences
- Narrative scenarios
- Available terrain collection

### Dynamic Updates

All validation metrics update in real-time as you:

- Add or remove terrain pieces
- Move pieces around the table
- Toggle terrain traits on/off
- Adjust piece sizes

### Non-Intrusive Design

The insights panel:

- Provides information without blocking the main canvas
- Collapses the "About" section by default
- Uses clear visual indicators (icons, colors)
- Offers actionable suggestions, not just problems

## Technical Implementation

The OPR insights system is implemented in:

- **Guidelines Logic:** `/src/lib/oprGuidelines.ts`
- **UI Component:** `/src/components/OPRInsightsPanel.tsx`
- **Tests:** `/src/lib/oprGuidelines.test.ts`

All terrain trait detection uses the actual trait IDs from the terrain catalog:

- `light-cover` — Soft Cover
- `heavy-cover` — Hard Cover
- `blocks-los` — Line of Sight Blocking

## Future Enhancements

Potential additions for future iterations:

- Table size scaling (adjust thresholds for 4'×6', 6'×4', etc.)
- Mission-specific recommendations
- Army type considerations (melee vs ranged heavy)
- Heat map visualization of terrain distribution
- Historical comparisons with saved layouts
- Export validation report with layout
