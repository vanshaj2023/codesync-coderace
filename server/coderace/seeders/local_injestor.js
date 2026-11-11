import fs from "fs";
// const extractFromCPP = (cppSnippet) => {
//   // 🔥 Strict multi-word matching to skip TreeNode comment constructors
//   const match = cppSnippet.match(/([\w<>&:]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
//   if (!match) return null;
//
//   const functionName = match[2]; // 2 is now the function name
//   const argsString = match[3];   // 3 is now the arguments string
//   // ... rest of extraction logic
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
//
console.log("🚀 Starting CodeRace Mass Ingestion Pipeline...");

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
// ⚠️ IMPORTANT: Load your secret key from .env
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- THE FOLDER WITH YOUR JSON FILES ---
const problemsDirectory = "./leetcode-problems/problems/"; // Change to your actual folder name

// ==========================================
// 1. THE C++ PARSER (PRIMARY SOURCE OF TRUTH)
// ==========================================
const cppTypeMap = {
  int: "integer",
  "long long": "long", // 🔥 Explicitly catch 64-bit integers
  long: "long",
  "vector<int>": "integer[]",
  "vector<int>&": "integer[]",
  "vector<long long>": "long[]",
  "vector<long long>&": "long[]",
  "vector<vector<int>>": "integer[][]",
  "vector<vector<int>>&": "integer[][]",
  "vector<vector<long long>>": "long[][]",
  "vector<vector<long long>>&": "long[][]",
  string: "string",
  "string&": "string",
  "vector<string>": "string[]",
  "vector<string>&": "string[]",
  bool: "boolean",
  char: "character",
  "ListNode*": "linked_list",
  "TreeNode*": "binary_tree",
};

const extractFromCPP = (cppSnippet) => {
  let className = "Solution";
  const classMatch = cppSnippet.match(/class\s+([a-zA-Z0-9_]+)/);
  if (classMatch) {
    className = classMatch[1];
  }
  const match = cppSnippet.match(/(\w+)\s*\(([^)]*)\)\s*\{/);
  if (!match) return null;

  const functionName = match[1];
  const argsString = match[2];
  const parameters = [];

  if (argsString.trim() !== "") {
    const rawArgs = argsString.split(",").map((arg) => arg.trim());
    for (const arg of rawArgs) {
      const parts = arg.split(/\s+/);
      const name = parts.pop();
      const rawType = parts.join("").trim();

      parameters.push({ name, type: cppTypeMap[rawType] || rawType });
    }
  }
  return { class_name: className, function_name: functionName, parameters };
};

// ==========================================
// 2. THE TYPESCRIPT PARSER (THE BACKUP)
// ==========================================
const tsTypeMap = {
  number: "integer", // Fallback to 32-bit if we only have TS
  "number[]": "integer[]",
  "number[][]": "integer[][]",
  string: "string",
  "string[]": "string[]",
  "string[][]": "string[][]",
  boolean: "boolean",
  "boolean[]": "boolean[]",
  character: "character",
  "character[]": "character[]",
  "character[][]": "character[][]",
  "ListNode | null": "linked_list",
  "TreeNode | null": "binary_tree",
};

const extractFromTS = (tsSnippet) => {
  const funcMatch = tsSnippet.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
  if (!funcMatch) return null;

  const functionName = funcMatch[1];
  const argsMatch = tsSnippet.match(/\(([^)]+)\)/);
  const parameters = [];

  if (argsMatch && argsMatch[1].trim()) {
    const rawArgs = argsMatch[1].split(",").map((arg) => arg.trim());
    for (const arg of rawArgs) {
      const [name, rawType] = arg.split(":").map((str) => str.trim());
      parameters.push({ name, type: tsTypeMap[rawType] || rawType });
    }
  }
  return { function_name: functionName, parameters };
};

// ==========================================
// 3. THE UPLOAD LOOP
// ==========================================
const runIngestion = async () => {
  if (!fs.existsSync(problemsDirectory))
    return console.error(`❌ Folder ${problemsDirectory} not found!`);

  const files = fs
    .readdirSync(problemsDirectory)
    .filter((file) => file.endsWith(".json"));

  console.log(`Found ${files.length} problem files. Uploading...\n`);

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(problemsDirectory, files[i]);
    const problem = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    try {
      // 1. EXTRACT METADATA dynamically!
      let problemMetadata = null;
      const snippets = problem.code_snippets || {};

      // 🔥 LOGIC UPDATE: Try C++ First
      if (snippets.cpp) {
        problemMetadata = extractFromCPP(snippets.cpp);
      }

      // 🔥 LOGIC UPDATE: Fallback to TS if C++ was missing or regex failed
      if (!problemMetadata && snippets.typescript) {
        problemMetadata = extractFromTS(snippets.typescript);
      }

      // If we couldn't parse it (Design problems, SQL, etc.), create a fallback
      if (!problemMetadata) {
        problemMetadata = { function_name: "unknown", parameters: [] };
      }

      // 2. FORMAT DATABASE ROW
      const dbRow = {
        title: problem.title,
        difficulty: problem.difficulty.toLowerCase(),
        description:
          problem.description ||
          "Description not available locally. Please view on LeetCode.",
        leetcode_id: parseInt(problem.problem_id || problem.frontend_id),
        likes: 0,
        dislikes: 0,
        problem_slug: problem.problemSlug,
        examples: problem.examples,
        constraints: problem.constraints,
        hints: problem.hints,

        // Push our dynamically generated metadata!
        metadata: problemMetadata,

        // Provide starter code if available
        code_snippets: snippets,

        // Cleaned up the copy-paste glitch here!
        test_cases: problem.examples || [],
      };

      // 3. UPSERT TO SUPABASE
      const { error: dbError } = await supabase.from("problems").upsert(dbRow, {
        onConflict: "leetcode_id", // Update if problem_slug already exists
      });

      if (dbError) throw dbError;

      successCount++;
      process.stdout.write(`\r✅ Uploaded: ${successCount}/${files.length} `);
    } catch (error) {
      console.log(`\n❌ Failed on ${files[i]}: ${error.message}`);
    }
  }

  console.log(
    `\n🎉 Process ended. Successfully ingested ${successCount} problems.`,
  );
};

runIngestion();
