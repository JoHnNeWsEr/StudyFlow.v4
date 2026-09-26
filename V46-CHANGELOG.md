# StudyFlow v46 — Goal-only Focus Start

## Focus flow change
- Removed the large generic **Start focus session** button from Study Goals.
- Study Goals is now goal-first: each active goal has its own `⋯` options.
- Opening a goal's `⋯` options now provides **Start this goal**.
- Starting from that goal starts the countdown immediately and returns to Home.
- The exact goal shows its live countdown beside it on Home without pressing Focus again.
- Goal focus duration is saved per goal and supports seconds, minutes, and hours.
- New goals default to 25 minutes.
- Existing goals without a saved duration fall back to 25 minutes.
- Removed the previous **Start this goal now** checkbox from goal creation; starting is now done from the individual goal options.
- Preserved Goal History, Restore, completion behavior, Events, Subjects, Schedule, notifications, and the existing Focus persistence/notification system.

## Verification
- JavaScript syntax check: passed with `node --check src/main.js`.
- Full Android build and real-device test: not performed in this environment.
