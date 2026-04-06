# Fix Plan for Issue #15

## Problems to Fix

### 1. Feature Not Reachable (BLOCKER)
- `AutoPlacementGenerator` is never rendered in the app
- App.tsx renders `LayoutStudio`, not `TerrainEditor`
- Need to integrate auto-placement into LayoutStudio

### 2. Strategy Implementation Bugs (BLOCKER)
- **Random strategy**: Currently enforces quarter coverage (same as balanced)
  - Fix: Skip quarter sequence for true random placement
- **Symmetrical strategy**: Wrong axis for portrait tables
  - Fix: Portrait 4'×6' (48×72) deploys left/right, needs vertical mirror
  - Fix: Mirror pairing after sort breaks intended mirrors
- **Asymmetric strategy**: Picks dense side per piece instead of per layout
  - Fix: Pick dense side once outside the loop

### 3. Config Flags Ignored (BLOCKER)
- `deploymentZoneSafety` is checked in UI but never read in generator
- `forceSymmetry` is checked in UI but never read in generator
- Fix: Pass and respect these flags in placement logic

### 4. Preference Not Persisted (BLOCKER)
- `placementConfig` is returned but TerrainEditor throws it away
- Fix: Store placementConfig with layout and re-apply on load

### 5. Tests Don't Verify Behavior (BLOCKER)
- Current tests only check that layouts generate
- Don't catch strategy bugs
- Fix: Add tests that verify strategy-specific behavior

## Implementation Plan

### Step 1: Fix Random Strategy
- Add a flag to skip quarter targets for true random
- Only use quarter sequence for balanced-coverage

### Step 2: Fix Symmetrical Strategy  
- Correct axis detection: check deployment orientation
- Store original piece order before sort to maintain mirror pairs

### Step 3: Fix Asymmetric Strategy
- Move denseSide selection outside tryPlacePiece
- Pass as context to the function

### Step 4: Implement Config Flags
- deploymentZoneSafety: adjust DEPLOYMENT_CENTER_CLEARANCE
- forceSymmetry: apply to balanced-coverage

### Step 5: Persist Placement Config
- Update TerrainEditor to store placementConfig
- Pass it through layout state

### Step 6: Integrate into LayoutStudio
- Add auto-placement panel to LayoutStudio
- Wire up to existing layout state

### Step 7: Add Proper Tests
- Test random produces different quarter distributions
- Test symmetrical actually mirrors
- Test asymmetric has one dense side
