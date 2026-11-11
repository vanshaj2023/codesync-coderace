import fs from "fs";
import path from "path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

console.log("⚡ Initializing CodeRace Ultimate 100% Parity Testing Harness...");

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- LOCAL CONFIGURATION ---
const CONFIG = {
  PROBLEM_ID: 42, // 283: Move Zeroes, 1192: Critical Connections, 1192: Critical Connections, 1192: Critical Connections
  CPP_SOLUTION_FILE: "./cpp-problems/42.cpp", 
  TEST_CASES_FILE: "./cpp-problems/42-tests.json",     
  ONECOMPILER_API_URL: "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
  API_KEY: process.env.COMPILER_API_KEY ||  process.env.RAPIDAPI_KEY,
};

// 🔥 THE 100% UNIVERSAL MAP 
const cppToCanonicalMap = {
  int: "integer", "long long": "long", double: "float", string: "string", bool: "boolean", char: "character",
  "vector<int>": "integer[]", "vector<long long>": "long[]", "vector<char>": "character[]", "vector<string>": "string[]",
  "vector<vector<int>>": "integer[][]", "vector<vector<char>>": "character[][]", "vector<vector<string>>": "string[][]",
  "ListNode*": "linked_list", "TreeNode*": "binary_tree", "GraphNode*": "graph", "DLLNode*": "dll", 
  "NaryNode*": "nary_tree", "RandomNode*": "random_list", "pair<int, int>": "int_pair", "pair<int,int>": "int_pair"
};

const normalizeCppType = (typeStr) => typeStr ? typeStr.trim().replace(/\s*\*\s*/g, "*").replace(/\s*&\s*/g, "&") : "";
const getCanonicalType = (rawType) => {
  if (!rawType) return "";
  let clean = rawType.replace(/&/g, "").trim(); 
  return cppToCanonicalMap[clean] || cppToCanonicalMap[rawType] || clean;
};

// ==========================================
// 1. STATELESS STDIN SERIALIZATION
// ==========================================
const serializeToStdin = (val, type) => {
  if (val === null || val === undefined) return "0";
  if (type === "boolean") return val ? "1" : "0";
  if (["integer", "long", "float", "string", "character"].includes(type)) return `${val}`;
  if (["integer[]", "long[]", "string[]", "character[]", "linked_list", "binary_tree", "dll", "nary_tree"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    return `${val.length} ${val.map((v) => (v === null ? "null" : v)).join(" ")}`;
  }
  
  // 🔥 FIX: JAGGED ARRAY SERIALIZER
  if (["integer[][]", "long[][]", "string[][]", "character[][]", "boolean[][]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    let result = `${val.length}`;
    for (const row of val) {
      if (!Array.isArray(row)) { result += " 0"; continue; }
      result += ` ${row.length} ` + row.map((v) => (v === null ? "null" : v)).join(" ");
    }
    return result;
  }
  
  if (type === "graph") {
    if (!Array.isArray(val) || val.length === 0) return "0";
    let result = `${val.length}`; 
    for (const neighbors of val) result += ` ${neighbors.length} ` + neighbors.join(" ");
    return result;
  }
  if (type === "random_list") {
    if (!Array.isArray(val) || val.length === 0) return "0";
    let result = `${val.length}`; 
    for (const pair of val) result += ` ${pair[0]} ${pair[1] === null ? "null" : pair[1]}`;
    return result;
  }
  if (type === "int_pair") {
    if (!Array.isArray(val) || val.length !== 2) return "0 0";
    return `${val[0]} ${val[1]}`;
  }
  return "";
};

// ==========================================
// 2A. STATELESS BATCH C++ WRAPPER
// ==========================================
const generateBatchCppWrapper = (userClassCode, metadata, returnType, functionName) => {
  const canonicalReturnType = getCanonicalType(returnType);
  const isVoid = canonicalReturnType === "void" || canonicalReturnType === "";
  const effectiveCanonicalReturnType = isVoid && metadata.parameters.length > 0 
    ? getCanonicalType(metadata.parameters[0].type) 
    : canonicalReturnType;

  let code = `
#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <stack>
#include <sstream>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <cmath>
#include <climits> 
#include <algorithm>
using namespace std;

struct ListNode { int val; ListNode *next; ListNode(int x) : val(x), next(NULL) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(int x) : val(x), left(NULL), right(NULL) {} };
struct DLLNode { int val; DLLNode *prev, *next; DLLNode(int x) : val(x), prev(NULL), next(NULL) {} };
class GraphNode { public: int val; vector<GraphNode*> neighbors; GraphNode() { val = 0; } GraphNode(int _val) { val = _val; } GraphNode(int _val, vector<GraphNode*> _neighbors) { val = _val; neighbors = _neighbors; } };
class NaryNode { public: int val; vector<NaryNode*> children; NaryNode() {} NaryNode(int _val) { val = _val; } NaryNode(int _val, vector<NaryNode*> _children) { val = _val; children = _children; } };
class RandomNode { public: int val; RandomNode *next, *random; RandomNode(int _val) { val = _val; next = NULL; random = NULL; } };

ListNode* readLinkedList() { int size; if (!(cin >> size) || size == 0) return nullptr; int val; cin >> val; ListNode* head = new ListNode(val); ListNode* curr = head; for(int i = 1; i < size; i++) { cin >> val; curr->next = new ListNode(val); curr = curr->next; } return head; }
TreeNode* readBinaryTree() { int size; if (!(cin >> size) || size == 0) return nullptr; vector<string> tokens(size); for(int i = 0; i < size; i++) cin >> tokens[i]; if (tokens[0] == "null") return nullptr; TreeNode* root = new TreeNode(stoi(tokens[0])); queue<TreeNode*> q; q.push(root); int i = 1; while(!q.empty() && i < size) { TreeNode* curr = q.front(); q.pop(); if (i < size && tokens[i] != "null") { curr->left = new TreeNode(stoi(tokens[i])); q.push(curr->left); } i++; if (i < size && tokens[i] != "null") { curr->right = new TreeNode(stoi(tokens[i])); q.push(curr->right); } i++; } return root; }
DLLNode* readDLL() { int size; if (!(cin >> size) || size == 0) return nullptr; int val; cin >> val; DLLNode* head = new DLLNode(val); DLLNode* curr = head; for(int i = 1; i < size; i++) { cin >> val; DLLNode* newNode = new DLLNode(val); curr->next = newNode; newNode->prev = curr; curr = newNode; } return head; }
GraphNode* readGraph() { int n; if (!(cin >> n) || n == 0) return nullptr; vector<GraphNode*> nodes(n + 1); for (int i = 1; i <= n; ++i) nodes[i] = new GraphNode(i); for (int i = 1; i <= n; ++i) { int k; cin >> k; for (int j = 0; j < k; ++j) { int nv; cin >> nv; nodes[i]->neighbors.push_back(nodes[nv]); } } return n > 0 ? nodes[1] : nullptr; }
NaryNode* readNaryTree() { int size; if (!(cin >> size) || size == 0) return nullptr; vector<string> tokens(size); for(int i=0; i<size; i++) cin >> tokens[i]; if(tokens[0] == "null") return nullptr; NaryNode* root = new NaryNode(stoi(tokens[0])); queue<NaryNode*> q; q.push(root); int i = 1; while(!q.empty() && i < size) { NaryNode* curr = q.front(); q.pop(); if (i < size && tokens[i] == "null") i++; while(i < size && tokens[i] != "null") { NaryNode* child = new NaryNode(stoi(tokens[i++])); curr->children.push_back(child); q.push(child); } } return root; }
RandomNode* readRandomList() { int size; if (!(cin >> size) || size == 0) return nullptr; vector<RandomNode*> nodes(size); vector<string> randomIdx(size); for(int i=0; i<size; i++) { int val; string ridx; cin >> val >> ridx; nodes[i] = new RandomNode(val); randomIdx[i] = ridx; if(i > 0) nodes[i-1]->next = nodes[i]; } for(int i=0; i<size; i++) { if(randomIdx[i] != "null") nodes[i]->random = nodes[stoi(randomIdx[i])]; } return nodes.size() ? nodes[0] : nullptr; }

void printOutput(int val) { cout << val; }
void printOutput(long long val) { cout << val; }
void printOutput(double val) { cout << val; }
void printOutput(bool val) { cout << (val ? "true" : "false"); }
void printOutput(char val) { cout << "\\"" << val << "\\""; }
void printOutput(string val) { cout << "\\"" << val << "\\""; }
void printOutput(ListNode* node) { cout << "["; while(node) { cout << node->val << (node->next ? "," : ""); node = node->next; } cout << "]"; }
void printOutput(TreeNode* node) { if (!node) cout << "[]"; else cout << "[Tree Root " << node->val << "]"; }
void printOutput(GraphNode* node) { if (!node) cout << "[]"; else cout << "[Graph Node " << node->val << "]"; }
void printOutput(DLLNode* node) { cout << "["; while(node) { cout << node->val << (node->next ? "," : ""); node = node->next; } cout << "]"; }
void printOutput(NaryNode* node) { if (!node) cout << "[]"; else cout << "[Nary Root " << node->val << "]"; }
void printOutput(RandomNode* node) { cout << "["; while(node) { cout << "[" << node->val << "," << (node->random ? to_string(node->random->val) : "null") << "]" << (node->next ? "," : ""); node = node->next; } cout << "]"; }
template<typename T, typename U> void printOutput(pair<T, U> const &p) { cout << "[" << p.first << "," << p.second << "]"; }
template<typename T> void printOutput(vector<T> const &vec) { cout << "["; for(size_t i = 0; i < vec.size(); i++) { printOutput(vec[i]); cout << (i == vec.size() - 1 ? "" : ","); } cout << "]"; }
template<typename T> void printOutput(vector<vector<T>> const &mat) { cout << "["; for(size_t i=0; i<mat.size(); i++) { printOutput(mat[i]); cout << (i == mat.size()-1 ? "" : ","); } cout << "]"; }

template<typename T> bool checkExpected(T a, T b) { return a == b; }
template<typename T> bool checkExpected(vector<T> const& a, vector<T> const& b) { return a == b; }
template<typename T> bool checkExpected(vector<vector<T>> const& a, vector<vector<T>> const& b) { return a == b; }
template<typename T, typename U> bool checkExpected(pair<T, U> const& a, pair<T, U> const& b) { return a.first == b.first && a.second == b.second; }
bool checkExpected(ListNode* a, ListNode* b) { while (a && b) { if (a->val != b->val) return false; a = a->next; b = b->next; } return a == nullptr && b == nullptr; }
bool checkExpected(TreeNode* a, TreeNode* b) { if (!a && !b) return true; if (!a || !b || a->val != b->val) return false; return checkExpected(a->left, b->left) && checkExpected(a->right, b->right); }
bool checkExpected(DLLNode* a, DLLNode* b) { DLLNode* tailA = nullptr; DLLNode* tailB = nullptr; while (a && b) { if (a->val != b->val) return false; tailA = a; tailB = b; a = a->next; b = b->next; } if (a != nullptr || b != nullptr) return false; while (tailA && tailB) { if (tailA->val != tailB->val) return false; tailA = tailA->prev; tailB = tailB->prev; } return tailA == nullptr && tailB == nullptr; }
bool checkExpected(NaryNode* a, NaryNode* b) { if (!a && !b) return true; if (!a || !b || a->val != b->val || a->children.size() != b->children.size()) return false; for(size_t i=0; i<a->children.size(); i++) { if(!checkExpected(a->children[i], b->children[i])) return false; } return true; }
bool checkExpected(RandomNode* a, RandomNode* b) { unordered_map<RandomNode*, RandomNode*> m; RandomNode* cA = a; RandomNode* cB = b; while(cA && cB) { if(cA->val != cB->val) return false; m[cA] = cB; cA = cA->next; cB = cB->next; } if(cA || cB) return false; cA = a; cB = b; while(cA && cB) { if(cA->random && !cB->random) return false; if(!cA->random && cB->random) return false; if(cA->random && cB->random && cA->random->val != cB->random->val) return false; cA = cA->next; cB = cB->next; } return true; }
bool checkExpected(GraphNode* res, GraphNode* exp) { if (!res && !exp) return true; if (!res || !exp) return false; unordered_map<GraphNode*, GraphNode*> visited; queue<pair<GraphNode*, GraphNode*>> q; q.push({res, exp}); visited[res] = exp; while(!q.empty()) { auto [r, e] = q.front(); q.pop(); if (r->val != e->val || r->neighbors.size() != e->neighbors.size()) return false; for(size_t i=0; i<r->neighbors.size(); i++) { if (visited.count(r->neighbors[i])) { if (visited[r->neighbors[i]] != e->neighbors[i]) return false; } else { visited[r->neighbors[i]] = e->neighbors[i]; q.push({r->neighbors[i], e->neighbors[i]}); } } } return true; }

${userClassCode}

int main() {
    int total_cases;
    if (!(cin >> total_cases)) return 0;
    Solution obj;
    for (int t = 0; t < total_cases; t++) {
        cout << "~CASE_START~\\n";
`;
  const args = [];
  metadata.parameters.forEach((param, idx) => {
    const varName = `arg_${idx}`;
    args.push(varName);
    code += generateTypeParserCpp(getCanonicalType(param.type), varName, "  ");
  });
  
  code += `\n    int has_expected_check; cin >> has_expected_check;\n`;
  code += generateTypeParserCpp(effectiveCanonicalReturnType, "expected_val", "    ");
  
  if (isVoid) {
    code += `
    obj.${functionName}(${args.join(", ")});
    auto result = arg_0;
    `;
  } else {
    code += `
    auto result = obj.${functionName}(${args.join(", ")});
    `;
  }

  code += `
    cout << "OUTPUT: "; printOutput(result); cout << endl;
    if (has_expected_check == 1) {
      if (!checkExpected(result, expected_val)) { cout << "STATUS: FAILED\\n~CASE_END~\\n"; return 0; }
    }
    cout << "STATUS: PASSED\\n~CASE_END~\\n";
  } return 0; }
`;
  return code;
};

const generateTypeParserCpp = (type, varName, tab) => {
  if (type === "integer") return `${tab}int ${varName}; cin >> ${varName};\n`;
  if (type === "long") return `${tab}long long ${varName}; cin >> ${varName};\n`;
  if (type === "float") return `${tab}double ${varName}; cin >> ${varName};\n`;
  if (type === "string") return `${tab}string ${varName}; cin >> ${varName};\n`;
  if (type === "character") return `${tab}char ${varName}; cin >> ${varName};\n`;
  if (type === "boolean") return `${tab}bool ${varName}; cin >> ${varName};\n`;
  
  if (type === "linked_list") return `${tab}ListNode* ${varName} = readLinkedList();\n`;
  if (type === "binary_tree") return `${tab}TreeNode* ${varName} = readBinaryTree();\n`;
  if (type === "dll") return `${tab}DLLNode* ${varName} = readDLL();\n`;
  if (type === "graph") return `${tab}GraphNode* ${varName} = readGraph();\n`;
  if (type === "nary_tree") return `${tab}NaryNode* ${varName} = readNaryTree();\n`;
  if (type === "random_list") return `${tab}RandomNode* ${varName} = readRandomList();\n`;
  if (type === "int_pair") return `${tab}int f_${varName}, s_${varName}; cin >> f_${varName} >> s_${varName};\n${tab}pair<int,int> ${varName} = {f_${varName}, s_${varName}};\n`;
  
  if (["integer[]", "long[]", "string[]", "character[]"].includes(type)) {
    let inner = "int";
    if (type === "long[]") inner = "long long";
    if (type === "string[]") inner = "string";
    if (type === "character[]") inner = "char";
    return `${tab}int size_${varName}; cin >> size_${varName};\n${tab}vector<${inner}> ${varName}(size_${varName});\n${tab}for(int j=0; j<size_${varName}; j++) cin >> ${varName}[j];\n`;
  }
  
  // 🔥 FIX: JAGGED ARRAY DESERIALIZER
  if (["integer[][]", "long[][]", "string[][]", "character[][]", "boolean[][]"].includes(type)) {
    let inner = "int";
    if (type === "long[][]") inner = "long long";
    if (type === "string[][]") inner = "string";
    if (type === "character[][]") inner = "char";
    if (type === "boolean[][]") inner = "bool";
    return `${tab}int r_${varName}; cin >> r_${varName};\n${tab}vector<vector<${inner}>> ${varName}(r_${varName});\n${tab}for(int i=0; i<r_${varName}; i++) { int c_${varName}; cin >> c_${varName}; ${varName}[i].resize(c_${varName}); for(int j=0; j<c_${varName}; j++) cin >> ${varName}[i][j]; }\n`;
  }
  return "";
};

// ==========================================
// 2B. STATEFUL (OOP) BATCH C++ WRAPPER
// ==========================================
const generateOopCppWrapper = (userClassCode, testSuiteCases) => {
  let code = `
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <list>
#include <stack>
#include <climits>   
#include <algorithm> 
using namespace std;

void printOutput(int val) { cout << val; }
void printOutput(bool val) { cout << (val ? "true" : "false"); }
void printOutput(string val) { cout << "\\"" << val << "\\""; }
template<typename T> void printOutput(vector<T> const &vec) { cout << "["; for(size_t i = 0; i < vec.size(); i++) { printOutput(vec[i]); cout << (i == vec.size() - 1 ? "" : ","); } cout << "]"; }

${userClassCode}

int main() {
`;
  testSuiteCases.forEach((tc, idx) => {
    const className = tc.commands[0];
    const constructorArgs = tc.args[0].join(', ');
    code += `  cout << "~CASE_START~\\nOUTPUT: [null";\n`;
    code += `  ${className}* obj_${idx} = new ${className}(${constructorArgs});\n`;
    for (let i = 1; i < tc.commands.length; i++) {
      let cmd = tc.commands[i];
      let argStr = tc.args[i].map(a => typeof a === 'string' ? `"${a}"` : a).join(', ');
      code += `  cout << ",";\n`;
      if (tc.expected[i] === null) {
        code += `  obj_${idx}->${cmd}(${argStr}); cout << "null";\n`;
      } else {
        code += `  auto res_${idx}_${i} = obj_${idx}->${cmd}(${argStr}); printOutput(res_${idx}_${i});\n`;
      }
    }
    code += `  cout << "]\\n~CASE_END~\\n";\n`;
  });
  code += `  return 0;\n}\n`;
  return code;
};

// ==========================================
// 3. EXECUTION AND ROUTING ENGINE
// ==========================================
const testHarnessPipeline = async () => {
  try {
    const { data: problem, error: dbError } = await supabase.from("problems").select("id, title, metadata").eq("leetcode_id", CONFIG.PROBLEM_ID).single();
    if (dbError || !problem) throw new Error(`Problem ID ${CONFIG.PROBLEM_ID} missing from database.`);
    if (!fs.existsSync(CONFIG.CPP_SOLUTION_FILE)) throw new Error(`Solution missing: ${CONFIG.CPP_SOLUTION_FILE}`);
    if (!fs.existsSync(CONFIG.TEST_CASES_FILE)) throw new Error(`Tests config file missing: ${CONFIG.TEST_CASES_FILE}`);

    const rawCppSolutionCode = fs.readFileSync(CONFIG.CPP_SOLUTION_FILE, "utf-8");
    const testSuiteCases = JSON.parse(fs.readFileSync(CONFIG.TEST_CASES_FILE, "utf-8"));

    const isStateful = testSuiteCases[0].commands !== undefined;
    let finalCompiledSource = "";
    let stdinPayload = "";
    let activeMetadata = problem.metadata;

    if (isStateful) {
      console.log(`\n🔥 Processing Dynamic OOP (Stateful) Execution Suite: "${problem.title}"`);
      finalCompiledSource = generateOopCppWrapper(rawCppSolutionCode, testSuiteCases);
    } else {
      console.log(`\n🔥 Processing Dynamic Stateless Execution Suite: "${problem.title}"`);
      const publicSection = rawCppSolutionCode.split(/public\s*:/)[1] || rawCppSolutionCode;
      const matchSignature = publicSection.match(/([\w<>&:* \t]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
      if (!matchSignature) throw new Error("Could not parse method signature from local file.");

      const returnType = normalizeCppType(matchSignature[1]);
      const localFunctionName = matchSignature[2];
      const localParameters = matchSignature[3].trim() === "" ? [] : matchSignature[3].split(",").map(arg => {
        const parts = arg.trim().split(/\s+/);
        let name = parts.pop(); let rawType = parts.join(" ");
        if (name.startsWith("*")) { name = name.slice(1); rawType += "*"; }
        if (name.startsWith("&")) { name = name.slice(1); rawType += "&"; }
        return { name, type: normalizeCppType(rawType) };
      });

      activeMetadata = { class_name: "Solution", function_name: localFunctionName, parameters: localParameters };
      stdinPayload = `${testSuiteCases.length}\n`;
      
      const isVoid = returnType === "void" || returnType === "";
      const effectiveReturnType = isVoid && localParameters.length > 0 ? localParameters[0].type : returnType;

      testSuiteCases.forEach((tc) => {
        activeMetadata.parameters.forEach((param, idx) => stdinPayload += serializeToStdin(tc.inputs[idx], getCanonicalType(param.type)) + "\n");
        if (tc.expected !== undefined) stdinPayload += `1\n${serializeToStdin(tc.expected, getCanonicalType(effectiveReturnType))}\n`;
        else stdinPayload += `0\n0\n`;
      });
      finalCompiledSource = generateBatchCppWrapper(rawCppSolutionCode, activeMetadata, returnType, localFunctionName);
    }

    console.log(`   📡 Shipping payload to OneCompiler API...`);
    const runResult = (await axios.post(CONFIG.ONECOMPILER_API_URL, 
      { language: "cpp", stdin: stdinPayload, files: [{ name: "index.cpp", content: finalCompiledSource }] },
      { headers: { "content-type": "application/json", "X-RapidAPI-Key": CONFIG.API_KEY, "X-RapidAPI-Host": "onecompiler-apis.p.rapidapi.com" } }
    )).data;

    if (runResult.stderr || runResult.exception) {
      console.log("\n❌ COMPILATION OR RUNTIME FAULT DETECTED:");
      console.error(runResult.stderr || runResult.exception);
      return;
    }

    console.log("\n================ ENGINE RESULT METRICS ================");
    console.log(`⏱️ Execution Time : ${runResult.executionTime || "N/A"} ms`);
    console.log(`💾 Process Memory : ${runResult.memory || "N/A"} KB`);
    console.log("=======================================================");

    const stdoutBlocks = runResult.stdout.split("~CASE_START~").map((b) => b.trim()).filter(Boolean);
    const updatedDatabasePayload = [];
    let processingHalted = false;

    for (let idx = 0; idx < testSuiteCases.length; idx++) {
      const originalCase = testSuiteCases[idx];
      const caseResultBlock = stdoutBlocks[idx];
      const outputMatch = caseResultBlock ? caseResultBlock.match(/OUTPUT:\s*(.*)/) : null;
      const rawCaseStdout = outputMatch ? outputMatch[1].trim() : "";

      let passed = false;
      if (isStateful) {
        const expectedString = JSON.stringify(originalCase.expected).replace(/,/g, ", ");
        const cleanStdout = rawCaseStdout.replace(/\s/g, "");
        const cleanExpected = expectedString.replace(/\s/g, "");
        
        passed = (cleanStdout === cleanExpected);
        if (!passed) {
          console.log(`❌ Test Case [${idx + 1}/${testSuiteCases.length}] FAILED validation.`);
          console.log(`   🚨 EXPECTED: ${cleanExpected}`);
          console.log(`   🛑 RECEIVED: ${cleanStdout}`);
        }
      } else {
        passed = !caseResultBlock.includes("STATUS: FAILED");
        if (!passed) {
          console.log(`❌ Test Case [${idx + 1}/${testSuiteCases.length}] FAILED validation.`);
          console.log(`   🚨 INPUT: ${JSON.stringify(originalCase.inputs)}`);
          console.log(`   🎯 EXPECTED: ${JSON.stringify(originalCase.expected)}`);
        }
      }

      if (passed) {
        console.log(`✅ Test Case [${idx + 1}/${testSuiteCases.length}] PASSED.`);
        updatedDatabasePayload.push({
          is_hidden: originalCase.is_hidden !== undefined ? originalCase.is_hidden : true,
          ...(isStateful ? { commands: originalCase.commands, args: originalCase.args } : { inputs: originalCase.inputs }),
          expected: originalCase.expected,
        });
      } else {
        if (caseResultBlock) console.log(`   📄 Captured Trace Log:\n${caseResultBlock}`);
        processingHalted = true;
        break;
      }
    }

    if (!processingHalted) {
      console.log("\n💾 Updating verified test cases AND fixing metadata in Supabase...");
      const { error: updateError } = await supabase.from("problems").update({ test_cases: updatedDatabasePayload, metadata: activeMetadata }).eq("leetcode_id", CONFIG.PROBLEM_ID);
      if (updateError) throw updateError;
      console.log("🎉 Verification Complete! Database healed and updated successfully.");
    }
  } catch (error) {
    console.error(`\n🚨 CRITICAL ERROR: ${error.message}`);
  }
};

testHarnessPipeline();