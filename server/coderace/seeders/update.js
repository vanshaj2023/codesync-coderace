import fs from "fs";
import path from "path";

console.log("🛠️ Injecting Code & Descriptions into Master JSON...");

const repoPath = "./LeetCode";
const metadataPath = "./aggregated_metadata.json";

const updateMetadata = () => {
  if (!fs.existsSync(metadataPath)) return console.error("❌ JSON not found!");

  const companyData = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  console.log(`Loaded ${companyData.length} problems from metadata.\n`);

  const folders = fs
    .readdirSync(repoPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("."))
    .map((dirent) => dirent.name);

  console.log(`Found ${folders.length} problem folders locally. Merging...`);

  let matchCount = 0;

  for (const folder of folders) {
    const folderPath = path.join(repoPath, folder);
    const readmePath = path.join(folderPath, "README.md");

    // Skip if there's no README
    if (!fs.existsSync(readmePath)) continue;

    let leetcodeId = null;
    let textSlug = folder;

    // Checks for formats like "0835-image-overlap" or "1480-running-sum-of-1d-array"
    const folderMatch = folder.match(/^0*(\d+)-/);
    if (folderMatch) {
      leetcodeId = parseInt(folderMatch[1]);
      textSlug = folder.replace(/^0*\d+-/, "").toLowerCase();
    }

    const readmeContent = fs.readFileSync(readmePath, "utf-8");

    // Fallback: If folder name is just "two-sum", extract ID from <h2> inside README
    if (!leetcodeId) {
      const h2Match = readmeContent.match(/<h2>(?:<a[^>]*>)?(\d+)\.\s/i);
      if (h2Match) leetcodeId = parseInt(h2Match[1]);
    }

    // Grab C++ Solution
    let cppSolution = null;
    const filesInFolder = fs.readdirSync(folderPath);
    const cppFile = filesInFolder.find((f) => f.endsWith(".cpp"));
    if (cppFile) {
      cppSolution = fs.readFileSync(path.join(folderPath, cppFile), "utf-8");
    }

    // --- 🎯 THE BULLETPROOF MATCHING LOGIC ---
    const problemIndex = companyData.findIndex((p) => {
      // 1. Try to match by Slug (extracting from whatever the URL key is named)
      const url = p.leetcode_url || p["Leetcode Question Link"];
      let jsonSlug = p.id;
      if (!jsonSlug && url) {
        jsonSlug = url.split("/").filter(Boolean).pop();
      }

      // 2. Try to match by ID (checking all possible uppercase/lowercase variations)
      const jsonId = parseInt(p.leetcode_id || p.ID || p.Id || p.id);

      // It's a match if either the URL slug matches OR the Integer ID matches!
      return (
        jsonSlug === textSlug || (leetcodeId !== null && jsonId === leetcodeId)
      );
    });

    if (problemIndex !== -1) {
      // INJECT the markdown and code!
      companyData[problemIndex].description = readmeContent;
      companyData[problemIndex].cpp_solution = cppSolution;
      matchCount++;
    }
  }

  // Save the updated data
  fs.writeFileSync(metadataPath, JSON.stringify(companyData, null, 2));

  console.log(
    `\n✅ Success! Added descriptions and code to ${matchCount} problems in aggregated_metadata.json.`,
  );
  if (matchCount > 0) {
    console.log(
      `Your JSON is now fully stacked and ready for database upload!`,
    );
  }
};

updateMetadata();
