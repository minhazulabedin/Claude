const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, PageBreak, AlignmentType,
} = require("docx");

const DIR = "/home/user/Claude/lab-final-tasks";
const SHOTS = path.join(DIR, "screenshots");

// image helper: scale to `widthPx` (96dpi px), keep aspect from real dimensions
const DIMS = {
  "task1_code_1.png": [1640, 1250], "task1_code_2.png": [1640, 1250],
  "task1_output.png": [1640, 502],
  "task2_code_1.png": [1640, 1330], "task2_code_2.png": [1640, 1290],
  "task2_output_1.png": [1640, 2390], "task2_output_2.png": [1640, 2390],
  "task2_output_3.png": [1640, 2390],
};
function shot(name, widthPx) {
  const [w, h] = DIMS[name];
  return new Paragraph({
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(path.join(SHOTS, name)),
      transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
    })],
    spacing: { after: 120 },
  });
}

const plain = (t, opts = {}) => new Paragraph({
  children: [new TextRun({ text: t, size: 24, bold: !!opts.bold, underline: opts.u ? {} : undefined })],
  spacing: { after: opts.after ?? 120 },
});

const codeLines = fs.readFileSync(path.join(DIR, "task2_vacuum_cleaning_agent.py"), "utf8")
  .replace(/\n+$/, "").split("\n")
  .map(l => new Paragraph({
    children: [new TextRun({ text: l || " ", font: "Consolas", size: 18 })],
    spacing: { after: 0, line: 240 },
  }));

const doc = new Document({
  creator: "Minhazul Abedin",
  title: "AI Final Lab Task Submission",
  styles: { default: { document: { run: { font: "Calibri", size: 24 } } } },
  sections: [{
    properties: {
      page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    children: [
      plain("Name: Minhazul Abedin"),
      plain("ID: 21-44625-1"),
      plain("Section: C"),
      plain("Semester: Summer 25-26", { after: 360 }),

      plain("Final Lab Task 1", { bold: true, u: true, after: 60 }),
      plain("Goal-Based Agent: Automated Water Purification System", { bold: true, after: 240 }),
      plain("Code Screenshot:", { bold: true }),
      shot("task1_code_1.png", 600),
      shot("task1_code_2.png", 600),
      plain("Output Screenshot:", { bold: true }),
      shot("task1_output.png", 600),

      new Paragraph({ children: [new PageBreak()] }),
      plain("Final Task – 2", { bold: true, u: true, after: 60 }),
      plain("Simple Rule-Based Vacuum Cleaning Agent", { bold: true, after: 240 }),
      plain("Code:", { bold: true }),
      ...codeLines,
      new Paragraph({ children: [new PageBreak()] }),
      plain("Code Screenshot:", { bold: true }),
      shot("task2_code_1.png", 600),
      shot("task2_code_2.png", 600),
      plain("Output Screenshot:", { bold: true }),
      shot("task2_output_1.png", 520),
      shot("task2_output_2.png", 520),
      shot("task2_output_3.png", 520),
    ],
  }],
});

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(path.join(DIR, "AI_Final_Lab_Task_Minhazul_21-44625-1.docx"), b);
  console.log("written");
});
