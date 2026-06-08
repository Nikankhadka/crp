---
name: careerpilot-document-converter
description: "Convert documents between formats. Markdown to PDF, PDF to text, DOCX handling. Uses pandoc for high-quality conversions."
metadata: { "openclaw": { "requires": { "anyBins": ["pandoc", "npx"] } } }
---

# Document Converter

Convert documents between formats. Markdown to PDF, PDF to text, DOCX handling. Uses pandoc for high-quality conversions.

## Trigger phrases
- "Convert resume to PDF"
- "Convert this PDF to text"
- "Convert markdown to DOCX"
- "Export resume as PDF"

## Instructions

### Step 1 — Get input file and desired output
Collect from user:
- Input file path
- Desired output format (PDF, DOCX, MD, TXT)

### Step 2 — Determine conversion method

**MD → PDF:**
```bash
pandoc input.md -o output.pdf --pdf-engine=xelatex
```
Or with custom template:
```bash
pandoc input.md -o output.pdf --pdf-engine=xelatex --template=resume-template.tex
```

**MD → DOCX:**
```bash
pandoc input.md -o output.docx
```

**PDF → Text:**
```bash
pdftotext input.pdf output.txt
```
Or using Python:
```bash
python3 -c "
import fitz
doc = fitz.open('input.pdf')
text = ''
for page in doc:
    text += page.get_text()
with open('output.txt', 'w') as f:
    f.write(text)
"
```

**DOCX → MD:**
```bash
pandoc input.docx -o output.md
```

**DOCX → PDF:**
```bash
pandoc input.docx -o output.pdf --pdf-engine=xelatex
```

### Step 3 — Handle missing tools
If pandoc not installed:
```bash
brew install pandoc
```

If xelatex not installed (for PDF):
```bash
brew install --cask mactex-no-gui
```

If pdftotext not installed:
```bash
brew install poppler
```

### Step 4 — Verify output
- Check file exists
- Check file size > 0
- Report output path to user

### Step 5 — Save output
Save to same directory as input, or user-specified path.

## Common Use Cases

### Resume to PDF
```bash
pandoc ~/careerpilot/data/profiles/tech/resume.md \
  -o ~/careerpilot/output/tech/resume.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in
```

### Cover Letter to PDF
```bash
pandoc ~/careerpilot/output/tech/cover_letter.txt \
  -o ~/careerpilot/output/tech/cover_letter.pdf \
  --pdf-engine=xelatex
```

### Batch Convert
Convert all tailored resumes in a folder:
```bash
for f in ~/careerpilot/output/tech/*/resume_tailored.md; do
  pandoc "$f" -o "${f%.md}.pdf" --pdf-engine=xelatex
done
```

## Notes
- PDF conversion requires pandoc + xelatex (or wkhtmltopdf)
- For simple conversions, online tools work too
- Always verify PDF output looks correct
- Use monospace fonts for code-heavy resumes
