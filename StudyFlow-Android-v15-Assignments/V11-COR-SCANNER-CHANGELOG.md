# StudyFlow v11 — COR scanner fix

This version adds a dedicated Certificate of Registration (COR) parser. COR tables place the descriptive subject title before the time and use compact day codes such as TF and MTH.

The scanner now:
- Detects each row from its course number (GE-E, GE-ES, GE-GB, GE-GS, ELC211, ELC 212-DIT, AC4, MSC 2, PATHFIT 3, etc.).
- Extracts the subject between the section and time columns instead of reading the text after the time.
- Understands compact COR day codes including TF and MTH.
- Handles wrapped subject titles such as PATHFIT.
- Keeps separate courses that share the same time.
- Still uses the existing general class-program OCR parsers as fallbacks.

Expected behavior for the supplied COR: Review & Edit should contain 9 rows, including Ethics, Environmental Science, Great Books, Gender & Society, Chemistry for Industrial Technologist, and Philippines Electrical Code.
