import fs from "fs";
import path from "path";

console.log("🛠️ Rebuilding the Master JSON file...");

const csvDirectory = "./csv_files"; // Your folder with all the CSVs
const outputPath = "./aggregated_metadata.json";

// We use an object to group companies together by the problem ID
const problemsMap = {};

// 1. Grab all CSV files
const files = fs
  .readdirSync(csvDirectory)
  .filter((file) => file.endsWith(".csv"));

for (const file of files) {
  // Extract "amazon" from "amazon_6months.csv"
  const companyName = file.split("_")[0].toLowerCase();
  const filePath = path.join(csvDirectory, file);

  // Read the file and split into rows
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // 2. Loop through every row (skipping the header row at index 0)
  for (let i = 1; i < lines.length; i++) {
    // This regex splits by comma, but ignores commas inside quotes
    const cols =
      lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");

    // If the row is broken or empty, skip it
    if (cols.length < 6) continue;

    // Clean up the columns by removing rogue quotes or spaces
    const id = cols[0].replace(/"/g, "").trim();
    const title = cols[1].replace(/"/g, "").trim();
    const acceptance = cols[2].replace(/"/g, "").trim();
    const difficulty = cols[3].replace(/"/g, "").trim();
    const frequency = cols[4].replace(/"/g, "").trim();
    const url = cols.slice(5).join(",").replace(/"/g, "").trim(); // slice(5) handles URLs with commas

    // 3. If we haven't seen this problem yet, create its profile
    if (!problemsMap[id]) {
      problemsMap[id] = {
        ID: id,
        Title: title,
        Acceptance: acceptance,
        Difficulty: difficulty,
        Frequency: frequency,
        "Leetcode Question Link": url,
        companies: [],
      };
    }

    // 4. Add the company to the problem's array (avoiding duplicates)
    if (!problemsMap[id].companies.includes(companyName)) {
      problemsMap[id].companies.push(companyName);
    }
  }
}

// Convert our map into a clean array
const finalData = Object.values(problemsMap);

// 5. Save the heavy-duty JSON file
fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

console.log(`✅ Master file rebuilt successfully!`);
console.log(`📊 Total unique problems stored: ${finalData.length}`);
