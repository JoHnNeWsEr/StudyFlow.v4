# StudyFlow v31

- Added the requested smooth modal transitions from the existing category-switch animation.
- Improved the guided tutorial so each Next/Back step fades and slides instead of flicking instantly.
- Added a short transition lock to prevent accidental rapid skipping when Next is tapped repeatedly.
- Tutorial spotlight now waits for the destination screen to render before positioning.
- Step 8 (Focus a specific task) now uses fallback selectors so it highlights an actual unfinished event when available, or the Events header when the list is empty.
- Preserved existing app behavior and data handling.
