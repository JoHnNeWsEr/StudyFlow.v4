# StudyFlow v52 — Single Modal Layer Fix

## Change
- Fixed stacked Study & Goals / Goal options / Edit Duration modal layers.
- StudyFlow now keeps only one active `#modal` layer at a time.
- Opening Goal options replaces the Study Goals modal instead of placing another modal on top of it.
- Opening Edit Duration replaces Goal options instead of stacking another modal.
- Pressing Start from Goal options now closes the only active modal and returns directly to Home.
- Prevents the user from needing to tap X/backdrop multiple times to reach Home.

## Preserved
- Goal History and centered View All History dialog.
- Goal-specific Focus duration.
- Live countdown.
- Clickable Home countdown controls.
- Goal Start / Edit duration / Delete menu.
- Stable app configuration and existing features.
