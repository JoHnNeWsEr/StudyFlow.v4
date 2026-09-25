# StudyFlow v12 — Subject/Course Scanner Fix

This version fixes a core scanner mistake: **course codes must never be stored as part of the Subject name**.

Examples:
- `GE-GS Gender & Society` → Subject: `Gender & Society`, Course Code: `GE-GS`
- `ELC211 Electrical Computer-Aided Design` → Subject: `Electrical Computer-Aided Design`, Course Code: `ELC211`
- `ELC212-DIT Philippines Electrical Code` → Subject: `Philippines Electrical Code`, Course Code: `ELC212-DIT`
- `AC4 Material Technology Management` → Subject: `Material Technology Management`, Course Code: `AC4`

The dedicated COR parser now uses the course-code + time row as the row anchor, removes the section code, preserves wrapped descriptive titles, recognizes compact COR day codes such as `TF` and `MTH`, and keeps instructor/room text separate when OCR provides it.

The merge stage now prefers the dedicated COR parse when multiple COR rows are detected, preventing the generic OCR parser from reintroducing malformed names such as `GE-GS Gender & Society` or `Technology Management`.

For the supplied NEMSU COR, the intended subject names are:
1. Material Technology Management
2. Electrical Computer-Aided Design
3. Philippines Electrical Code
4. Ethics
5. Environmental Science
6. Great Books
7. Gender & Society
8. Chemistry for Industrial Technologist
9. Choices Dance, Sports, Martial Arts, Group Exercise, Outdoor and Adventure Activities

Instructor is only imported when the source document actually contains an instructor value.
