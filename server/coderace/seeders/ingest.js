import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

console.log("🚀 Starting CodeRace Mass Ingestion Pipeline...");

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- SOURCE DEFINITIONS ---
const problemsDirectory = "../leetcode-problems-master/problems/";

// 🔥 100% UNIVERSAL MAP (Synced with Harness)
const universalTypeMap = {
  int: "integer", "long long": "long", double: "float", string: "string", bool: "boolean", char: "character",
  "vector<int>": "integer[]", "vector<long long>": "long[]", "vector<char>": "character[]", "vector<string>": "string[]",
  "vector<vector<int>>": "integer[][]", "vector<vector<char>>": "character[][]", "vector<vector<string>>": "string[][]",
  "ListNode*": "linked_list", "TreeNode*": "binary_tree", "GraphNode*": "graph", "DLLNode*": "dll", 
  "NaryNode*": "nary_tree", "RandomNode*": "random_list", "pair<int, int>": "int_pair", "pair<int,int>": "int_pair",
  // TypeScript Equivalents
  number: "integer", "number[]": "integer[]", "number[][]": "integer[][]",
  boolean: "boolean", "boolean[]": "boolean[]",
  "string[]": "string[]", "string[][]": "string[][]",
  "ListNode | null": "linked_list", "TreeNode | null": "binary_tree",
  void: "void"
};

const normalizeType = (typeStr) => typeStr ? typeStr.trim().replace(/\s*\*\s*/g, "*").replace(/\s*&\s*/g, "&") : "";
const getCanonicalType = (rawType) => {
  if (!rawType) return "void";
  let clean = rawType.replace(/&/g, "").trim(); 
  return universalTypeMap[clean] || universalTypeMap[rawType] || clean;
};

// ==========================================
// 1. THE C++ PARSER (PRIMARY SOURCE OF TRUTH)
// ==========================================
const extractFromCPP = (cppSnippet) => {
  let className = "Solution";
  
  // 🔥 SAFEGUARD 1: Atomic comment stripping. Eliminates structural notes completely.
  const cleanSnippet = cppSnippet
    .replace(/\/\*[\s\S]*?\*\//g, "") // Strips block comments
    .replace(/\/\/.*/g, ""); // Strips trailing inline comments

  const classMatch = cleanSnippet.match(/class\s+([a-zA-Z0-9_]+)/);
  if (classMatch) {
    className = classMatch[1];
  }

  // 🔥 SAFEGUARD 2: Isolate public block to avoid matching private helpers or internal structs
  const publicSection = cleanSnippet.split(/public\s*:/)[1] || cleanSnippet;

  // 🔥 SAFEGUARD 3: Strict signature matcher synced with harness (captures return type)
  const match = publicSection.match(/([\w<>&:* \t]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
  if (!match) return null;

  const rawReturnType = match[1];
  const functionName = match[2];
  const argsString = match[3];
  const parameters = [];

  if (argsString.trim() !== "") {
    const rawArgs = argsString.split(",").map((arg) => arg.trim());
    for (const arg of rawArgs) {
      const parts = arg.split(/\s+/);
      let name = parts.pop();
      let rawType = parts.join(" ").trim();

      // Pointer alignment re-balancer
      if (name.startsWith("*")) {
        name = name.slice(1);
        rawType += "*";
      }
      if (name.startsWith("&")) {
        name = name.slice(1);
        rawType += "&";
      }

      parameters.push({
        name: name,
        type: getCanonicalType(normalizeType(rawType)),
      });
    }
  }
  
  return { 
    class_name: className, 
    function_name: functionName, 
    return_type: getCanonicalType(normalizeType(rawReturnType)),
    parameters 
  };
};

// ==========================================
// 2. THE TYPESCRIPT PARSER (THE BACKUP)
// ==========================================
const extractFromTS = (tsSnippet) => {
  // Strip comments first to prevent false matches
  const cleanSnippet = tsSnippet
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  let className = "Solution";
  const classMatch = cleanSnippet.match(/class\s+([a-zA-Z0-9_]+)/);
  if (classMatch) {
    className = classMatch[1];
  }

  // Match function name, args, and optional return type before the opening brace
  const funcMatch = cleanSnippet.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*:\s*([\w\[\]\s\|<>]+))?\s*\{/);
  if (!funcMatch) return null;

  const functionName = funcMatch[1];
  const argsString = funcMatch[2];
  const rawReturnType = funcMatch[3] || "void";
  const parameters = [];

  if (argsString && argsString.trim()) {
    const rawArgs = argsString.split(",").map((arg) => arg.trim());
    for (const arg of rawArgs) {
      const [name, rawType] = arg.split(":").map((str) => str.trim());
      parameters.push({
        name: name,
        type: getCanonicalType(rawType),
      });
    }
  }
  
  return { 
    class_name: className, 
    function_name: functionName, 
    return_type: getCanonicalType(rawReturnType),
    parameters 
  };
};

// ==========================================
// 3. THE INGESTION LOOP ENGINE
// ==========================================
const runIngestion = async () => {
  if (!fs.existsSync(problemsDirectory)) {
    return console.error(`❌ Target processing folder ${problemsDirectory} not found!`);
  }

  const files = fs
    .readdirSync(problemsDirectory)
    .filter((file) => file.endsWith(".json"));

  console.log(`Found ${files.length} problem files. Uploading pipeline active...\n`);

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(problemsDirectory, files[i]);
    const problem = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    try {
      let problemMetadata = null;
      const snippets = problem.code_snippets || {};

      if (snippets.cpp) {
        problemMetadata = extractFromCPP(snippets.cpp);
      }

      if (!problemMetadata && snippets.typescript) {
        problemMetadata = extractFromTS(snippets.typescript);
      }

      // Safe fallback if parsing fails
      if (!problemMetadata) {
        problemMetadata = {
          class_name: "Solution",
          function_name: "unknown",
          return_type: "void",
          parameters: [],
        };
      }

      const safeLeetcodeId = parseInt(problem.problem_id || problem.frontend_id);
      const safeSlug = problem.problemSlug || problem.problem_slug || `problem-${safeLeetcodeId}`;

      const dbRow = {
        id: safeSlug, 
        title: problem.title || "Untitled Problem",
        difficulty: problem.difficulty ? problem.difficulty.toLowerCase() : "medium",
        description: problem.description || "Description not available locally. Please view on LeetCode.",
        leetcode_id: safeLeetcodeId,
        likes: 0,
        dislikes: 0,
        problem_slug: safeSlug,
        examples: problem.examples || [],
        constraints: problem.constraints || [],
        hints: problem.hints || [],
        metadata: problemMetadata, // Now includes return_type automatically
        code_snippets: snippets,
        test_cases: problem.examples || [], 
      };

      const { error: dbError } = await supabase.from("problems").upsert(dbRow, {
        onConflict: "leetcode_id",
      });

      if (dbError) throw dbError;

      successCount++;
      process.stdout.write(`\r✅ Ingested: ${successCount}/${files.length} components `);
    } catch (error) {
      console.log(`\n❌ Ingestion fault encountered on file [${files[i]}]: ${error.message}`);
    }
  }

  console.log(`\n\n🎉 Process ended. Successfully standardized and deployed ${successCount} total problems.`);
};

runIngestion();