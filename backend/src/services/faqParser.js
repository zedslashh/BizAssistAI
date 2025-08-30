import fs from "fs";
import csv from "csv-parse";
import pdf from "pdf-parse";
import mammoth from "mammoth";

// Reads a file and extracts Q&A
export async function parseFAQ(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();

  if (ext === "csv") {
    return await parseCSV(filePath);
  }
  if (ext === "pdf") {
    return await parsePDF(filePath);
  }
  if (ext === "docx") {
    return await parseDocx(filePath);
  }

  throw new Error("Unsupported file type");
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const faqs = [];
    fs.createReadStream(filePath)
      .pipe(csv({ columns: true, skip_empty_lines: true }))
      .on("data", row => {
        faqs.push({ question: row.question, answer: row.answer });
      })
      .on("end", () => resolve(faqs))
      .on("error", err => reject(err));
  });
}

async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  // naive split by line
  return data.text.split("\n").map(line => ({ question: line, answer: "" }));
}

async function parseDocx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { value } = await mammoth.extractRawText({ buffer });
  return value.split("\n").map(line => ({ question: line, answer: "" }));
}
