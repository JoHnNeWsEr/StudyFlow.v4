# StudyFlow v10 — scanner row recovery fix

## Fix
The scanner now has a second, text-based row parser in addition to the table-column parser. This is important for class-program photos where Tesseract recognizes the text but gives some rows incomplete/low-confidence column boxes.

The fallback:
- keeps the current Monday/Thursday, Wednesday, and Tuesday/Friday section days;
- detects every line containing a start/end time;
- removes course codes such as GE-GS, GE-E, GE-GB, GE-ES, PATHFIT 3, ELC 211, ELC 212, MSC 2 and AC 4;
- removes the units/hours numbers at the end of the subject column;
- merges fallback rows with the normal OCR result without creating duplicate class meetings.

For the supplied class-program photo, the review screen should now recover all 9 actual subjects:
1. Gender & Society
2. Choice of Dance, Sports, Martial Arts, Group Exercise, Outdoor and Adventure Activities
3. Electrical Computer-Aided Design
4. Electrical Machines
5. Ethics
6. Chemistry for Industrial Technologist
7. Great Books
8. Environmental Science
9. Material Technology Management

Import creates one subject record for each detected subject and class meetings for each selected day. The import alert reports the actual number inserted.
