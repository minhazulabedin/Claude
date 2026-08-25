# AI Final Lab Tasks — Summer 25-26

| File | Description |
|---|---|
| `task1_water_purification_agent.py` | Task 1 — Goal-Based Agent: Automated Water Purification System |
| `task2_vacuum_cleaning_agent.py` | Task 2 — Simple Rule-Based Vacuum Cleaning Agent (4×4 grid world) |
| `build_submission_pdf.py` | Renders both programs + their real console output into the submission PDF |
| `AI_Final_Lab_Task_Submission.pdf` | **The file to submit** (5 pages) |

## Run the programs

```bash
python3 task1_water_purification_agent.py
python3 task2_vacuum_cleaning_agent.py
```

Task 2's output is byte-for-byte identical to the provided
`Final_Task2_SampleOutput_Vaccume.txt` sample.

## Put your ID / Section on the PDF

Edit the four constants at the top of `build_submission_pdf.py`:

```python
STUDENT_NAME = "Minhazul Abedin"
STUDENT_ID   = "________________"
SECTION      = "________"
SEMESTER     = "Summer 25-26"
```

then regenerate:

```bash
python3 build_submission_pdf.py
```
