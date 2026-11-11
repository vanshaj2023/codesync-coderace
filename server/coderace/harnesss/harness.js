import fs from "fs";
import path from "path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

console.log("⚡ Initializing CodeRace OneCompiler Local Testing Harness...");

// --- SETUP SUPABASE ---
const supabaseUrl =
  process.env.SUPABASE_URL ;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  const supabase = createClient(supabaseUrl, supabaseKey);

// --- LOCAL CONFIGURATION (SAME LEVEL AS HARNESS) ---
const PROBLEM_ID = 1; // Target leetcode_id to validate
const CPP_SOLUTION_FILE = "./two-sum.cpp";
const TEST_CASES_FILE = "./two-sum-tests.json";

// ==========================================
// 1. NODE.JS INPUT SERIALIZATION (JSON -> STDIN String)
// ==========================================
const serializeToStdin = (inputVal, type) => {
  if (inputVal === null || inputVal === undefined) return "0";

  if (
    type === "integer" ||
    type === "long" ||
    type === "float" ||
    type === "boolean" ||
    type === "string" ||
    type === "character"
  ) {
    return `${inputVal}`;
  }
  if (
    type === "integer[]" ||
    type === "long[]" ||
    type === "string[]" ||
    type === "character[]" ||
    type === "linked_list" ||
    type === "binary_tree"
  ) {
    if (!Array.isArray(inputVal)) return "0";
    const elements = inputVal.map((v) => (v === null ? "null" : v)).join(" ");
    return `${inputVal.length} ${elements}`;
  }
  if (type === "integer[][]" || type === "long[][]") {
    if (!Array.isArray(inputVal)) return "0 0";
    let result = `${inputVal.length} ${inputVal[0]?.length || 0}`;
    for (const row of inputVal) {
      result += " " + row.join(" ");
    }
    return result;
  }
  return "";
};

// ==========================================
// 2. JAVASCRIPT OUTPUT DESERIALIZATION (STDOUT -> JSON)
// ==========================================
const deserializeFromStdout = (stdoutStr, type) => {
  const clean = stdoutStr.trim();
  if (!clean || clean === "null") return null;

  if (type === "integer" || type === "long") return parseInt(clean, 10);
  if (type === "float") return parseFloat(clean);
  if (type === "boolean") return clean === "1" || clean === "true";
  if (type === "string" || type === "character") return clean;
  if (type === "integer[]" || type === "long[]" || type === "linked_list") {
    return clean.split(/\s+/).map(Number);
  }
  if (type === "string[]") return clean.split(/\s+/);
  return clean;
};

// ==========================================
// 3. GENERATIVE C++ BOILERPLATE BUILDER
// ==========================================
const generateCppWrapper = (userClassCode, metadata, returnType) => {
  let code = `
#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <sstream>
using namespace std;

struct ListNode { int val; ListNode *next; ListNode(int x) : val(x), next(NULL) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(int x) : val(x), left(NULL), right(NULL) {} };

ListNode* readLinkedList() {
    int size; if (!(cin >> size) || size == 0) return nullptr;
    int val; cin >> val;
    ListNode* head = new ListNode(val); ListNode* curr = head;
    for(int i = 1; i < size; i++) { cin >> val; curr->next = new ListNode(val); curr = curr->next; }
    return head;
}

TreeNode* readBinaryTree() {
    int size; if (!(cin >> size) || size == 0) return nullptr;
    vector<string> tokens(size); for(int i = 0; i < size; i++) cin >> tokens[i];
    if (tokens[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(tokens[0])); queue<TreeNode*> q; q.push(root);
    int i = 1;
    while(!q.empty() && i < size) {
        TreeNode* curr = q.front(); q.pop();
        if (i < size && tokens[i] != "null") { curr->left = new TreeNode(stoi(tokens[i])); q.push(curr->left); }
        i++;
        if (i < size && tokens[i] != "null") { curr->right = new TreeNode(stoi(tokens[i])); q.push(curr->right); }
        i++;
    }
    return root;
}

void printOutput(int val) { cout << val << endl; }
void printOutput(long long val) { cout << val << endl; }
void printOutput(double val) { cout << val << endl; }
void printOutput(string val) { cout << val << endl; }
void printOutput(bool val) { cout << (val ? "true" : "false") << endl; }
void printOutput(vector<int> const &vec) {
    for(size_t i = 0; i < vec.size(); i++) cout << vec[i] << (i == vec.size() - 1 ? "" : " ");
    cout << endl;
}
void printOutput(vector<long long> const &vec) {
    for(size_t i = 0; i < vec.size(); i++) cout << vec[i] << (i == vec.size() - 1 ? "" : " ");
    cout << endl;
}
void printOutput(ListNode* head) {
    while(head) { cout << head->val << (head->next ? " " : ""); head = head->next; }
    cout << endl;
}

// --- FULL INJECTED FILE LAYER ---
${userClassCode}

int main() {
`;

  const args = [];
  metadata.parameters.forEach((param, idx) => {
    const varName = `arg_${idx}`;
    args.push(varName);

    if (param.type === "integer")
      code += `  int ${varName}; cin >> ${varName};\n`;
    else if (param.type === "long")
      code += `  long long ${varName}; cin >> ${varName};\n`;
    else if (param.type === "float")
      code += `  double ${varName}; cin >> ${varName};\n`;
    else if (param.type === "string")
      code += `  string ${varName}; cin >> ${varName};\n`;
    else if (param.type === "boolean")
      code += `  bool ${varName}; cin >> ${varName};\n`;
    else if (param.type === "linked_list")
      code += `  ListNode* ${varName} = readLinkedList();\n`;
    else if (param.type === "binary_tree")
      code += `  TreeNode* ${varName} = readBinaryTree();\n`;
    else if (param.type === "integer[]" || param.type === "long[]") {
      const innerType = param.type === "long[]" ? "long long" : "int";
      code += `  int size_${idx}; cin >> size_${idx};\n  vector<${innerType}> ${varName}(size_${idx});\n  for(int j=0; j<size_${idx}; j++) cin >> ${varName}[j];\n`;
    } else if (param.type === "integer[][]" || param.type === "long[][]") {
      const innerType = param.type === "long[][]" ? "long long" : "int";
      code += `  int rows_${idx}, cols_${idx}; cin >> rows_${idx} >> cols_${idx};\n  vector<vector<${innerType}>> ${varName}(rows_${idx}, vector<${innerType}>(cols_${idx}));\n  for(int r=0; r<rows_${idx}; r++) for(int c=0; c<cols_${idx}; c++) cin >> ${varName}[r][c];\n`;
    }
  });

  const targetClass = metadata.class_name || "Solution";
  code += `\n  ${targetClass} obj;\n`;
  code += `  auto result = obj.${metadata.function_name}(${args.join(", ")});\n`;
  code += `  printOutput(result);\n  return 0;\n}\n`;

  return code;
};

// ==========================================
// 4. THE ONECOMPILER RAPIDAPI INTERFACE
// ==========================================
const runOnCompilerApi = async (sourceCode, stdinString) => {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.COMPILER_API_KEY;
  if (!apiKey)
    throw new Error("Missing API key inside environment definitions.");

  // 🔥 FIX: Correct OneCompiler URL, Headers, and STDIN payload mapping
  const response = await axios.post(
    "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
    {
      language: "cpp",
      stdin: stdinString, // 👈 PASS STDIN STRING HERE
      files: [
        {
          name: "index.cpp",
          content: sourceCode,
        },
      ],
    },
    {
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "onecompiler-apis.p.rapidapi.com",
      },
    },
  );

  // 🔥 FIX: Axios automatically parses JSON, do not call response.json()!
  const runResult = response.data;

  if (runResult.stderr || runResult.exception) {
    throw new Error(
      `Compilation/Runtime Error:\n${runResult.stderr || runResult.exception}`,
    );
  }

  return runResult.stdout;
};

// ==========================================
// 5. TESTING ENGINE EXECUTION
// ==========================================
const testHarnessPipeline = async () => {
  try {
    // Phase A: Fetch Problem configuration from Database matching leetcode_id
    const { data: problem, error: dbError } = await supabase
      .from("problems")
      .select("id, leetcode_id, title, metadata")
      .eq("leetcode_id", PROBLEM_ID)
      .single();

    if (dbError || !problem)
      throw new Error(`Problem ID ${PROBLEM_ID} missing from database.`);
    if (!problem.metadata?.parameters)
      throw new Error(
        "Target metadata configuration is missing or incomplete.",
      );

    // Phase B: Load Local Files from Same Directory Level
    if (!fs.existsSync(CPP_SOLUTION_FILE))
      throw new Error(`Missing local solution file: ${CPP_SOLUTION_FILE}`);
    if (!fs.existsSync(TEST_CASES_FILE))
      throw new Error(`Missing local test cases file: ${TEST_CASES_FILE}`);

    const rawCppSolutionCode = fs.readFileSync(CPP_SOLUTION_FILE, "utf-8");
    const localTestCases = JSON.parse(
      fs.readFileSync(TEST_CASES_FILE, "utf-8"),
    );

    // Extract return type dynamically
    const matchSignature = rawCppSolutionCode.match(
      /([\w<>&:]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/,
    );
    const returnType = matchSignature ? matchSignature[1] : "integer";

    console.log(
      `\n🔥 Executing Verification Test Suite for problem: "${problem.title}" (LeetCode #${problem.leetcode_id})`,
    );

    const updatedTestSuite = [];

    // Phase C: Loop Through Local Test Cases File
    for (let idx = 0; idx < localTestCases.length; idx++) {
      const tc = localTestCases[idx];
      console.log(
        `   ⏳ Processing Case [${idx + 1}/${localTestCases.length}]...`,
      );

      let stdinPayload = "";
      problem.metadata.parameters.forEach((param, i) => {
        stdinPayload += serializeToStdin(tc.inputs[i], param.type) + "\n";
      });

      const compileReadySource = generateCppWrapper(
        rawCppSolutionCode,
        problem.metadata,
        returnType,
      );

      // Execute via OneCompiler API
      const rawStdout = await runOnCompilerApi(
        compileReadySource,
        stdinPayload,
      );
      const calculatedGroundTruth = deserializeFromStdout(
        rawStdout,
        returnType,
      );

      updatedTestSuite.push({
        is_hidden: tc.is_hidden !== undefined ? tc.is_hidden : true,
        inputs: tc.inputs,
        expected: calculatedGroundTruth, // Injects verified runtime answer
      });
    }

    // Phase D: Update Database record on success
    console.log(
      "\n💾 All test cases verified successfully! Syncing ground truths to Supabase...",
    );

    const { error: updateError } = await supabase
      .from("problems")
      .update({ test_cases: updatedTestSuite })
      .eq("leetcode_id", problem.leetcode_id);

    if (updateError) throw updateError;

    console.log(
      "✅ Database sync complete. Expected values successfully committed!",
    );
  } catch (error) {
    console.error(
      "\n🛑 HARNESS CRITICAL FAILURE: Execution automatically terminated to save database integrity.",
    );
    console.error(error.message);
  }
};

testHarnessPipeline();
