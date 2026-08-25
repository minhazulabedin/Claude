# AI Final Lab Tasks — Summer 25-26

| File | Description |
|---|---|
| `task1_water_purification_agent.py` | Task 1 — Goal-Based Agent: Automated Water Purification System |
| `task2_vacuum_cleaning_agent.py` | Task 2 — Simple Rule-Based Vacuum Cleaning Agent (4×4 grid world) |
| `build_submission_pdf.py` | Runs both programs and renders code + captured output into the PDF |
| `screenshots/` | The generated PNG screenshots (paste these into Word if you prefer) |
| `AI_Final_Lab_Task_Submission.pdf` | **The file to submit** (7 pages) |

## Run the programs

```bash
python3 task1_water_purification_agent.py
python3 task2_vacuum_cleaning_agent.py
```

Task 2's output is byte-for-byte identical to the provided
`Final_Task2_SampleOutput_Vaccume.txt` sample (all 141 lines).

## Regenerate the PDF

Edit the constants at the top of `build_submission_pdf.py`:

```python
STUDENT_NAME = "Minhazul Abedin"
STUDENT_ID   = "________________"
SECTION      = "________"
SEMESTER     = "Summer 25-26"
PROMPT       = "PS C:\\Users\\Minhaz\\Desktop\\AI Lab>"   # prompt in the terminal shots
WORKSPACE    = "AI Lab"                                   # folder in the title bar
```

then run:

```bash
python3 build_submission_pdf.py
```

The screenshots are rendered by headless Chromium (VS Code "Dark+" theme), not
captured from a real machine — the code and the console output in them are real,
but the window chrome and shell prompt are cosmetic.
