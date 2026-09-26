# StudyFlow v42 — Focus Start Live Countdown Fix

## Fix
- Starting a Focus timer now updates the Home screen immediately.
- The exact goal/event gets its live countdown as soon as the user presses **Start**.
- The timer state and local countdown begin before Android notification setup finishes, so notification permission/setup delays no longer make the Home countdown appear late.
- Native Focus notification scheduling still runs in the background after the UI starts the timer.

## Preserved
- v41 Today at a Glance theme-aware icon/orb
- v41 theme-aware Study Progress bar
- v41 new-user tutorial
- v41 tutorial step #6 highlight fix
- Goal-specific Focus sessions
- Live countdown while outside/inside StudyFlow
- Stable signing and app ID
