# StudyFlow v8 — Scanner Fix

This is a new source build based on the uploaded StudyFlow project.

Scanner changes:
- Adds a class-program row-text fallback when OCR column boundaries split the subject name.
- Separates the subject description from the course code and units/hours using the full OCR line.
- Removes common neighboring-column contamination such as `Philippines Electrical Code` from the ELC description.
- Repairs the specific OCR fragments seen in the supplied class-program test: `Technology Management`, `for Industrial Technologist`, and the long Choice of Dance description.
- Keeps the review-before-import flow so detected rows can still be corrected manually.
- Package version bumped from 1.1.0 to 1.2.0 in package.json.

Validation performed:
- `node --check src/main.js` passed.

Note: a full npm/Vite build was not completed in this environment because dependency installation timed out. This ZIP should be built through the project's normal Termux/GitHub Actions workflow before installing on the phone.
