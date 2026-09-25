# StudyFlow v13 — COR Scanner Fix

Fixes the time-first OCR pattern from NEMSU CORs, e.g. `1:00-3:30 ELC211 Electrical Computer-Aided Design`.

Course codes are separated from subject names. Long titles can continue onto the next OCR line. Instructor lines with titles or `Surname, Given Name` are captured separately. Day codes can be inherited from a heading.

The Review & Edit screen remains the final verification step before import.
