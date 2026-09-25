# StudyFlow v9 — Scanner row-detection fix

This version fixes the actual failure seen on the supplied class-program photo.

## What changed
- OCR now reads the same photo in three passes: original table image, contrast-enhanced image, and a sparse-text pass.
- Results from all passes are combined and duplicate class rows are removed.
- The scanner no longer relies on one OCR pass to find every table row. This is specifically intended to recover faint rows such as GE-GS, GE-E, GE-GB, and GE-ES.
- Review screen reports the number of detected class rows before import.
- Import still creates one subject entry per detected subject and one class meeting per selected day.

Expected result for the supplied photo: the review screen should contain the 9 class rows represented by the schedule, including Gender & Society, Ethics, Great Books, and Environmental Science.
