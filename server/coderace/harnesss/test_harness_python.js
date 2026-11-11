import fs from "fs";
import path from "path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

console.log("🛡️ Initializing CodeRace Indestructible Python Testing Harness (Titanium Edition)...");

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- LOCAL CONFIGURATION ---
const CONFIG = {
  PROBLEM_ID: 429, // 212: Word Search, 138: Deep Copy, 160: Intersection, 157: IO Mock
  PYTHON_SOLUTION_FILE: "./python-problems/429.py", 
  TEST_CASES_FILE: "./python-problems/429-tests.json",     
  ONECOMPILER_API_URL: "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
  API_KEY: process.env.COMPILER_API_KEY ||  process.env.RAPIDAPI_KEY,
};

// 🔥 UNIVERSAL CUSTOM JUDGER ROUTING
const JUDGE_OVERRIDES = {
  26: "IN_PLACE_K", 
  27: "IN_PLACE_K", 
  1114: "THREADING",
  133: "DEEP_COPY", // Clone Graph
  138: "DEEP_COPY", // Copy List with Random Pointer
  160: "INTERSECTION", // Intersection of Two Linked Lists
  157: "IO_MOCK", // Read N Characters Given Read4
  158: "IO_MOCK"  // Read N Characters Given Read4 II
};

// 🔥 THE PYTHON 100% UNIVERSAL MAP 
const pythonToCanonicalMap = {
  "int": "integer", "float": "float", "str": "string", "bool": "boolean",
  "list[int]": "integer[]", "list[float]": "float[]", "list[str]": "string[]", "list[bool]": "boolean[]",
  "list[list[int]]": "integer[][]", "list[list[float]]": "float[][]", "list[list[str]]": "string[][]", "list[list[bool]]": "boolean[][]",
  "listnode": "linked_list", "optional[listnode]": "linked_list",
  "treenode": "binary_tree", "optional[treenode]": "binary_tree",
  "node": "graph", "optional[node]": "graph",
  "dllnode": "dll", "optional[dllnode]": "dll",
  "narynode": "nary_tree", "optional[narynode]": "nary_tree",
  "randomnode": "random_list", "optional[randomnode]": "random_list"
};

const normalizePythonType = (typeStr) => typeStr ? typeStr.trim() : "";

const getCanonicalType = (rawType) => {
  if (!rawType) return "";
  let clean = rawType.toLowerCase().replace(/\s/g, ""); 
  let exactMatch = Object.keys(pythonToCanonicalMap).find(k => k === clean);
  if (exactMatch) return pythonToCanonicalMap[exactMatch];
  const sortedKeys = Object.keys(pythonToCanonicalMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key)) return pythonToCanonicalMap[key];
  }
  return clean;
};

const encodeSafe = (v) => v === null || v === undefined ? "null" : "B64:" + Buffer.from(String(v)).toString('base64');

// 🔥 STRING-SAFE WHITESPACE STRIPPER
const stripWhitespaceSafe = (str) => {
  if (!str) return "";
  return str.replace(/\s+(?=(?:(?:[^"]*"){2})*[^"]*$)/g, "");
};

// ==========================================
// 1. STATELESS STDIN SERIALIZATION (JSON SHIELD)
// ==========================================
const serializeToStdin = (val, type) => {
  if (val === null || val === undefined) return "0";
  if (type === "boolean") return val ? "1" : "0";
  if (["integer", "long", "float"].includes(type)) return `${val}`;
  if (["string", "character"].includes(type)) return encodeSafe(val); 
  
  if (["integer[]", "long[]", "float[]", "boolean[]", "linked_list", "binary_tree", "dll", "nary_tree"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    if (val.length === 1 && Array.isArray(val[0])) val = val[0];
    return `${val.length} ${val.map((v) => (v === null ? "null" : (type === "boolean[]" ? (v ? "1" : "0") : v))).join(" ")}`;
  }
  
  if (["string[]", "character[]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    if (val.length === 1 && Array.isArray(val[0])) val = val[0];
    return `${val.length} ${val.map(encodeSafe).join(" ")}`; 
  }
  
  if (["integer[][]", "long[][]", "float[][]", "boolean[][]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    if (val.length === 1 && Array.isArray(val[0]) && Array.isArray(val[0][0])) val = val[0];
    let result = `${val.length}`;
    for (const row of val) {
      if (!Array.isArray(row)) { result += " 0"; continue; }
      result += ` ${row.length} ` + row.map((v) => (v === null ? "null" : (type === "boolean[][]" ? (v ? "1" : "0") : v))).join(" ");
    }
    return result;
  }

  if (["string[][]", "character[][]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    if (val.length === 1 && Array.isArray(val[0]) && Array.isArray(val[0][0])) val = val[0];
    let result = `${val.length}`;
    for (const row of val) {
      if (!Array.isArray(row)) { result += " 0"; continue; }
      result += ` ${row.length} ` + row.map(encodeSafe).join(" "); 
    }
    return result;
  }
  
  if (type === "graph") {
    if (!Array.isArray(val) || val.length === 0) return "0";
    if (val.length === 1 && Array.isArray(val[0])) val = val[0];
    let result = `${val.length}`; 
    for (const neighbors of val) result += ` ${neighbors.length} ` + neighbors.join(" ");
    return result;
  }
  if (type === "random_list") {
    if (!Array.isArray(val) || val.length === 0) return "0";
    if (val.length === 1 && Array.isArray(val[0])) val = val[0];
    let result = `${val.length}`; 
    for (const pair of val) result += ` ${pair[0]} ${pair[1] === null ? "null" : pair[1]}`;
    return result;
  }
  if (type === "int_pair") {
    if (!Array.isArray(val) || val.length !== 2) return "0 0";
    if (val.length === 1 && Array.isArray(val[0]) && val[0].length === 2) val = val[0];
    return `${val[0]} ${val[1]}`;
  }
  return "";
};

// ==========================================
// 2A. STATELESS BATCH PYTHON WRAPPER
// ==========================================
const generateBatchPythonWrapper = (userClassCode, metadata, returnType, functionName, customJudgeType) => {
  const canonicalReturnType = getCanonicalType(returnType);
  const isVoid = canonicalReturnType === "void" || canonicalReturnType === "";
  const effectiveCanonicalReturnType = isVoid && metadata.parameters.length > 0 ? getCanonicalType(metadata.parameters[0].type) : canonicalReturnType;

  let code = `
import sys, base64, json, math, heapq, bisect, itertools
from collections import deque, defaultdict, Counter
from typing import *

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class DLLNode:
    def __init__(self, val=0, prev=None, next=None):
        self.val = val
        self.prev = prev
        self.next = next

class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

class NaryNode:
    def __init__(self, val=0, children=None):
        self.val = val
        self.children = children if children is not None else []

class RandomNode:
    def __init__(self, x=0, next=None, random=None):
        self.val = x
        self.next = next
        self.random = random

def get_token_generator():
    for line in sys.stdin:
        for token in line.split(): yield token
TOKEN_GEN = get_token_generator()

def next_token():
    try: return next(TOKEN_GEN)
    except StopIteration: return None

def read_string():
    t = next_token()
    if t == "null" or not t: return None
    return base64.b64decode(t[4:]).decode('utf-8')

def read_linked_list():
    t = next_token()
    if not t or t == "0": return None
    size = int(t)
    head = ListNode(int(next_token()))
    curr = head
    for _ in range(1, size):
        curr.next = ListNode(int(next_token()))
        curr = curr.next
    return head

def read_binary_tree():
    t = next_token()
    if not t or t == "0": return None
    size = int(t)
    tokens = [next_token() for _ in range(size)]
    if tokens[0] == "null": return None
    root = TreeNode(int(tokens[0]))
    q = deque([root])
    i = 1
    while q and i < size:
        curr = q.popleft()
        if i < size and tokens[i] != "null":
            curr.left = TreeNode(int(tokens[i]))
            q.append(curr.left)
        i += 1
        if i < size and tokens[i] != "null":
            curr.right = TreeNode(int(tokens[i]))
            q.append(curr.right)
        i += 1
    return root

def read_graph():
    t = next_token()
    if not t or t == "0": return None
    n = int(t)
    nodes = {i: GraphNode(i) for i in range(1, n + 1)}
    for i in range(1, n + 1):
        k = int(next_token())
        for _ in range(k):
            nv = int(next_token())
            nodes[i].neighbors.append(nodes[nv])
    return nodes[1] if n > 0 else None

def read_dll():
    t = next_token()
    if not t or t == "0": return None
    size = int(t)
    head = DLLNode(int(next_token()))
    curr = head
    for _ in range(1, size):
        new_node = DLLNode(int(next_token()))
        curr.next = new_node
        new_node.prev = curr
        curr = new_node
    return head

def read_nary_tree():
    t = next_token()
    if not t or t == "0": return None
    size = int(t)
    tokens = [next_token() for _ in range(size)]
    if tokens[0] == "null": return None
    root = NaryNode(int(tokens[0]))
    q = deque([root])
    i = 1
    while q and i < size:
        curr = q.popleft()
        if i < size and tokens[i] == "null": i += 1
        while i < size and tokens[i] != "null":
            child = NaryNode(int(tokens[i]))
            curr.children.append(child)
            q.append(child)
            i += 1
    return root

def read_random_list():
    t = next_token()
    if not t or t == "0": return None
    size = int(t)
    nodes, random_indices = [], []
    for _ in range(size):
        nodes.append(RandomNode(int(next_token())))
        random_indices.append(next_token())
    for i in range(1, size):
        nodes[i-1].next = nodes[i]
    for i in range(size):
        if random_indices[i] != "null":
            nodes[i].random = nodes[int(random_indices[i])]
    return nodes[0] if size > 0 else None

def print_output(val):
    if val is None:
        print("null", end="")
    elif isinstance(val, bool):
        print("true" if val else "false", end="")
    elif isinstance(val, (int, float)):
        print(f"{val:g}" if isinstance(val, float) else val, end="")
    elif isinstance(val, str):
        print(f'"{val}"', end="")
    elif isinstance(val, list):
        print("[", end="")
        for i, v in enumerate(val):
            print_output(v)
            if i < len(val) - 1: print(",", end="")
        print("]", end="")
    elif type(val).__name__ in ('ListNode', 'DLLNode'):
        print("[", end="")
        v_set = set()
        curr = val
        while curr:
            if curr in v_set:
                print("CYCLE_DETECTED", end="")
                break
            v_set.add(curr)
            print(curr.val, end="")
            if getattr(curr, 'next', None): print(",", end="")
            curr = curr.next
        print("]", end="")
    elif type(val).__name__ == 'TreeNode':
        print(f"[Tree Root {val.val}]" if val else "[]", end="")
    elif type(val).__name__ == 'NaryNode':
        print(f"[Nary Root {val.val}]" if val else "[]", end="")
    elif type(val).__name__ == 'GraphNode':
        print(f"[Graph Node {val.val}]" if val else "[]", end="")
    elif type(val).__name__ == 'RandomNode':
        print("[", end="")
        v_set = set()
        curr = val
        while curr:
            if curr in v_set:
                print("CYCLE_DETECTED", end="")
                break
            v_set.add(curr)
            rv = str(curr.random.val) if curr.random else "null"
            print(f"[{curr.val},{rv}]", end="")
            if curr.next: print(",", end="")
            curr = curr.next
        print("]", end="")
    else:
        print(val, end="")

def sort_nested(iterable):
    if isinstance(iterable, list):
        sorted_items = [sort_nested(x) for x in iterable]
        try: return sorted(sorted_items)
        except TypeError: return sorted(sorted_items, key=lambda x: str(x))
    return iterable

def check_expected(a, b):
    if a is None and b is None: return True
    if a is None or b is None: return False
    if isinstance(a, float) and isinstance(b, float): return abs(a - b) < 1e-5
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): return False
        strict_match = True
        for i in range(len(a)):
            if not check_expected(a[i], b[i]): 
                strict_match = False; break
        if strict_match: return True
        try: return sort_nested(a) == sort_nested(b)
        except Exception: return False
            
    if type(a).__name__ == 'ListNode' or type(b).__name__ == 'ListNode':
        vA, vB = set(), set()
        while a and b:
            if a in vA and b in vB: return True
            if a in vA or b in vB or getattr(a, 'val', None) != getattr(b, 'val', None): return False
            vA.add(a); vB.add(b)
            a, b = getattr(a, 'next', None), getattr(b, 'next', None)
        return a is None and b is None

    if type(a).__name__ == 'DLLNode' or type(b).__name__ == 'DLLNode':
        tailA, tailB = None, None
        while a and b:
            if getattr(a, 'val', None) != getattr(b, 'val', None): return False
            tailA, tailB = a, b
            a, b = getattr(a, 'next', None), getattr(b, 'next', None)
        if a or b: return False
        while tailA and tailB:
            if getattr(tailA, 'val', None) != getattr(tailB, 'val', None): return False
            tailA, tailB = getattr(tailA, 'prev', None), getattr(tailB, 'prev', None)
        return not tailA and not tailB
        
    if type(a).__name__ == 'RandomNode' or type(b).__name__ == 'RandomNode':
        vA, vB = set(), set()
        cA, cB = a, b
        while cA and cB:
            if cA in vA and cB in vB: return True
            if cA in vA or cB in vB or getattr(cA, 'val', None) != getattr(cB, 'val', None): return False
            rA, rB = getattr(cA, 'random', None), getattr(cB, 'random', None)
            if (rA is None) != (rB is None): return False
            if rA and rB and rA.val != rB.val: return False
            vA.add(cA); vB.add(cB)
            cA, cB = getattr(cA, 'next', None), getattr(cB, 'next', None)
        return cA is None and cB is None
        
    if type(a).__name__ == 'TreeNode' or type(b).__name__ == 'TreeNode':
        if getattr(a, 'val', None) != getattr(b, 'val', None): return False
        return check_expected(getattr(a, 'left', None), getattr(b, 'left', None)) and check_expected(getattr(a, 'right', None), getattr(b, 'right', None))

    if type(a).__name__ == 'NaryNode' or type(b).__name__ == 'NaryNode':
        if getattr(a, 'val', None) != getattr(b, 'val', None): return False
        cA, cB = getattr(a, 'children', []), getattr(b, 'children', [])
        if len(cA) != len(cB): return False
        for i in range(len(cA)):
            if not check_expected(cA[i], cB[i]): return False
        return True

    if type(a).__name__ == 'GraphNode' or type(b).__name__ == 'GraphNode':
        visited = {a: b}
        q = deque([(a, b)])
        while q:
            r, e = q.popleft()
            if r.val != e.val or len(r.neighbors) != len(e.neighbors): return False
            for i in range(len(r.neighbors)):
                rN, eN = r.neighbors[i], e.neighbors[i]
                if rN in visited:
                    if visited[rN] != eN: return False
                else:
                    visited[rN] = eN
                    q.append((rN, eN))
        return True
    return a == b

# 🔥 IO_MOCK: Hidden File System Interceptor
class _MockFileSystem:
    def __init__(self, content):
        self.content = content
        self.ptr = 0
    def read4(self, buf4):
        i = 0
        while i < 4 and self.ptr < len(self.content):
            buf4[i] = self.content[self.ptr]
            self.ptr += 1
            i += 1
        return i

_file_state = _MockFileSystem("")
def read4(buf4: List[str]) -> int:
    return _file_state.read4(buf4)

${userClassCode}

if __name__ == "__main__":
    t_str = next_token()
    if not t_str: sys.exit(0)
    total_cases = int(t_str)
    obj = Solution()
    
    for _ in range(total_cases):
        print("~CASE_START~")
`;
  
  const args = [];
  metadata.parameters.forEach((param, idx) => {
    const varName = `arg_${idx}`;
    args.push(varName);
    code += generateTypeParserPython(getCanonicalType(param.type), param.type, varName, "        ");
  });
  
  code += `\n        has_expected_check = int(next_token())\n`;
  
  if (customJudgeType === "IN_PLACE_K") {
    code += generateTypeParserPython("integer[]", "list[int]", "expected_val", "        ");
  } else {
    code += generateTypeParserPython(effectiveCanonicalReturnType, effectiveCanonicalReturnType, "expected_val", "        ");
  }

  // 🔥 INTERSECTION: Memory Stitcher Pre-Execution
  if (customJudgeType === "INTERSECTION") {
    code += `
        # LeetCode 160 formats input as: listA, listB, skipA, skipB
        currA, currB = arg_0, arg_1
        for _ in range(arg_2 if 'arg_2' in locals() else 0): 
            if currA: currA = currA.next
        for _ in range(arg_3 if 'arg_3' in locals() else 0): 
            if currB: currB = currB.next
        if currA and currB: currB.next = currA # Physical pointer intersection created
    `;
  }
  
  // 🔥 IO_MOCK: File State Initialization Pre-Execution
  if (customJudgeType === "IO_MOCK") {
    code += `
        # Load the mock file string into the global state
        global _file_state
        _file_state = _MockFileSystem(arg_0)
        arg_0 = [""] * 1024 # Initialize empty buffer array for user
    `;
  }
  
  // Execution
  if (isVoid) {
    code += `
        obj.${functionName}(${args.join(", ")})
        result = arg_0
`;
  } else if (customJudgeType === "IN_PLACE_K") {
    code += `
        k_val = obj.${functionName}(${args.join(", ")})
        result = arg_0[:k_val] if isinstance(k_val, int) and 0 <= k_val <= len(arg_0) else []
`;
  } else {
    code += `
        result = obj.${functionName}(${args.join(", ")})
`;
  }

  // 🔥 DEEP_COPY: Memory Reference Verification Post-Execution
  if (customJudgeType === "DEEP_COPY") {
    code += `
        if result is not None and arg_0 is not None and id(result) == id(arg_0):
            print("OUTPUT: Error: Deep copy expected, but memory pointers are identical.")
            print("STATUS: FAILED\\n~CASE_END~")
            continue
    `;
  }

  code += `
        print("OUTPUT: ", end="")
        print_output(result)
        print()
        
        if has_expected_check == 1:
            if not check_expected(result, expected_val):
                print("STATUS: FAILED\\n~CASE_END~")
                continue
                
        print("STATUS: PASSED\\n~CASE_END~")
`;
  return code;
};

const generateTypeParserPython = (type, rawType, varName, tab) => {
  if (type === "integer") return `${tab}${varName} = int(next_token())\n`;
  if (type === "float") return `${tab}${varName} = float(next_token())\n`;
  if (type === "string" || type === "character") return `${tab}${varName} = read_string()\n`;
  if (type === "boolean") return `${tab}${varName} = (next_token() == "1")\n`;
  
  if (type === "linked_list") return `${tab}${varName} = read_linked_list()\n`;
  if (type === "binary_tree") return `${tab}${varName} = read_binary_tree()\n`;
  if (type === "graph") return `${tab}${varName} = read_graph()\n`;
  if (type === "dll") return `${tab}${varName} = read_dll()\n`;
  if (type === "nary_tree") return `${tab}${varName} = read_nary_tree()\n`;
  if (type === "random_list") return `${tab}${varName} = read_random_list()\n`;
  
  if (["integer[]", "float[]", "string[]", "character[]", "boolean[]"].includes(type)) {
    let cast = "int";
    if (type === "float[]") cast = "float";
    if (type === "string[]" || type === "character[]") cast = "read_string";
    if (type === "boolean[]") cast = 'lambda: next_token() == "1"';
    return `${tab}size_${varName} = int(next_token())\n${tab}${varName} = []\n${tab}for _ in range(size_${varName}):\n${tab}    ${varName}.append(${cast === "read_string" || cast.includes("lambda") ? cast + "()" : cast + "(next_token())"})\n`;
  }
  
  if (["integer[][]", "float[][]", "string[][]", "character[][]", "boolean[][]"].includes(type)) {
    let cast = "int";
    if (type === "float[][]") cast = "float";
    if (type === "string[][]" || type === "character[][]") cast = "read_string";
    if (type === "boolean[][]") cast = 'lambda: next_token() == "1"';
    return `${tab}r_${varName} = int(next_token())\n${tab}${varName} = []\n${tab}for _ in range(r_${varName}):\n${tab}    c_${varName} = int(next_token())\n${tab}    row = []\n${tab}    for _ in range(c_${varName}):\n${tab}        row.append(${cast === "read_string" || cast.includes("lambda") ? cast + "()" : cast + "(next_token())"})\n${tab}    ${varName}.append(row)\n`;
  }
  return "";
};

// ==========================================
// 2B. STATEFUL (OOP) BATCH PYTHON WRAPPER
// ==========================================
const generateOopPythonWrapper = (userClassCode, testSuiteCases) => {
  let code = `
import sys, base64, json, math, heapq, bisect, itertools
from collections import deque, defaultdict, Counter
from typing import *

def print_output(val):
    if val is None:
        print("null", end="")
    elif isinstance(val, bool):
        print("true" if val else "false", end="")
    elif isinstance(val, str):
        print(f'"{val}"', end="")
    elif isinstance(val, list):
        print("[", end="")
        for i, v in enumerate(val):
            print_output(v)
            if i < len(val) - 1: print(",", end="")
        print("]", end="")
    else:
        print(val, end="")

${userClassCode}

if __name__ == "__main__":
`;
  testSuiteCases.forEach((tc, idx) => {
    const className = tc.commands[0];
    const constructorArgs = tc.args[0].map(a => JSON.stringify(a)).join(', ');
    code += `    print("~CASE_START~\\nOUTPUT: [null", end="")\n`;
    code += `    obj_${idx} = ${className}(${constructorArgs})\n`;
    for (let i = 1; i < tc.commands.length; i++) {
      let cmd = tc.commands[i];
      let argStr = tc.args[i].map(a => JSON.stringify(a)).join(', ');
      code += `    print(",", end="")\n`;
      if (tc.expected[i] === null) {
        code += `    obj_${idx}.${cmd}(${argStr})\n    print("null", end="")\n`;
      } else {
        code += `    res_${idx}_${i} = obj_${idx}.${cmd}(${argStr})\n    print_output(res_${idx}_${i})\n`;
      }
    }
    code += `    print("]\\n~CASE_END~")\n`;
  });
  return code;
};

// ==========================================
// 2C. CONCURRENCY (THREADING) PYTHON WRAPPER
// ==========================================
const generateThreadingPythonWrapper = (userClassCode) => {
  return `
import sys, base64, json, threading, time, io
from typing import *

def get_token_generator():
    for line in sys.stdin:
        for token in line.split(): yield token
TOKEN_GEN = get_token_generator()

def next_token():
    try: return next(TOKEN_GEN)
    except StopIteration: return None

def read_string():
    t = next_token()
    if t == "null" or not t: return None
    return base64.b64decode(t[4:]).decode('utf-8')

${userClassCode}

if __name__ == "__main__":
    t_str = next_token()
    if not t_str: sys.exit(0)
    total_cases = int(t_str)
    
    for _ in range(total_cases):
        print("~CASE_START~")
        size_str = next_token()
        if not size_str: break
        size = int(size_str)
        order = [int(next_token()) for _ in range(size)]
        
        has_expected_check = int(next_token())
        expected_val = read_string() if has_expected_check == 1 else ""
        
        try:
            obj = Foo()
        except NameError:
            print("OUTPUT: Error: class 'Foo' not defined.")
            print("STATUS: FAILED\\n~CASE_END~")
            continue
            
        out_buffer = io.StringIO()
        def printFirst(): out_buffer.write("first")
        def printSecond(): out_buffer.write("second")
        def printThird(): out_buffer.write("third")
        
        threads = []
        for thread_num in order:
            if thread_num == 1: t = threading.Thread(target=obj.first, args=(printFirst,))
            elif thread_num == 2: t = threading.Thread(target=obj.second, args=(printSecond,))
            elif thread_num == 3: t = threading.Thread(target=obj.third, args=(printThird,))
            threads.append(t)
            t.start()
            time.sleep(0.05) 
            
        for t in threads:
            t.join()
            
        result = out_buffer.getvalue()
        print("OUTPUT: " + result)
        
        if has_expected_check == 1:
            if result != expected_val:
                print("STATUS: FAILED\\n~CASE_END~")
                continue
        print("STATUS: PASSED\\n~CASE_END~")
`;
};

// ==========================================
// 3. EXECUTION AND ROUTING ENGINE (BATCHED)
// ==========================================
const testHarnessPipeline = async () => {
  try {
    const { data: problem, error: dbError } = await supabase.from("problems").select("id, title, metadata").eq("leetcode_id", CONFIG.PROBLEM_ID).single();
    if (dbError || !problem) throw new Error(`Problem ID ${CONFIG.PROBLEM_ID} missing from database.`);
    if (!fs.existsSync(CONFIG.PYTHON_SOLUTION_FILE)) throw new Error(`Solution missing: ${CONFIG.PYTHON_SOLUTION_FILE}`);
    if (!fs.existsSync(CONFIG.TEST_CASES_FILE)) throw new Error(`Tests config file missing: ${CONFIG.TEST_CASES_FILE}`);

    const rawPythonSolutionCode = fs.readFileSync(CONFIG.PYTHON_SOLUTION_FILE, "utf-8");
    const testSuiteCases = JSON.parse(fs.readFileSync(CONFIG.TEST_CASES_FILE, "utf-8"));

    const isStateful = testSuiteCases[0].commands !== undefined;
    const customJudgeType = JUDGE_OVERRIDES[CONFIG.PROBLEM_ID] || "DEFAULT";

    let activeMetadata = problem.metadata;
    let localFunctionName = "";
    let returnType = "";
    let effectiveReturnType = "";

    if (!isStateful && customJudgeType !== "THREADING") {
      const solutionBlockSplit = rawPythonSolutionCode.split(/class\s+Solution\s*:/);
      const solutionBlock = solutionBlockSplit.length > 1 ? solutionBlockSplit[1] : rawPythonSolutionCode;
      
      const matchSignature = solutionBlock.match(/def\s+(?!__init__\b)(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\)\s*(?:->\s*([a-zA-Z0-9_\[\],\. ]+))?:/);
      if (!matchSignature) throw new Error("Could not parse method signature from Python file.");

      localFunctionName = matchSignature[1];
      returnType = normalizePythonType(matchSignature[3] || "");
      
      const argsRaw = matchSignature[2] ? matchSignature[2].split(",").map(a => a.trim()).filter(a => a && a !== "self") : [];
      const localParameters = argsRaw.map(arg => {
        const [name, type] = arg.split(":").map(s => s.trim());
        return { name, type: normalizePythonType(type) };
      });

      activeMetadata = { class_name: "Solution", function_name: localFunctionName, parameters: localParameters };
      const isVoid = returnType === "none" || returnType === "";
      effectiveReturnType = isVoid && localParameters.length > 0 ? localParameters[0].type : returnType;
      if (customJudgeType === "IN_PLACE_K") effectiveReturnType = "list[int]";
    }

    const BATCH_SIZE = 10;
    console.log(`\n📦 Initializing Payload Pagination: Splitting ${testSuiteCases.length} cases into batches of ${BATCH_SIZE}...`);
    
    let totalExecutionTime = 0;
    const updatedDatabasePayload = [];
    let processingHalted = false;

    for (let batchStart = 0; batchStart < testSuiteCases.length; batchStart += BATCH_SIZE) {
      if (processingHalted) break;
      
      const batchCases = testSuiteCases.slice(batchStart, batchStart + BATCH_SIZE);
      console.log(`\n🚀 Shipping Batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (${batchCases.length} cases) to API...`);
      
      let finalCompiledSource = "";
      let stdinPayload = `${batchCases.length}\n`;

      if (customJudgeType === "THREADING") {
        batchCases.forEach((tc) => {
          stdinPayload += serializeToStdin(tc.inputs[0], "integer[]") + "\n";
          if (tc.expected !== undefined) stdinPayload += `1\n${serializeToStdin(tc.expected, "string")}\n`;
          else stdinPayload += `0\n0\n`;
        });
        finalCompiledSource = generateThreadingPythonWrapper(rawPythonSolutionCode);
      } else if (isStateful) {
        finalCompiledSource = generateOopPythonWrapper(rawPythonSolutionCode, batchCases);
      } else {
        batchCases.forEach((tc) => {
          activeMetadata.parameters.forEach((param, idx) => stdinPayload += serializeToStdin(tc.inputs[idx], getCanonicalType(param.type)) + "\n");
          if (tc.expected !== undefined) stdinPayload += `1\n${serializeToStdin(tc.expected, getCanonicalType(effectiveReturnType))}\n`;
          else stdinPayload += `0\n0\n`;
        });
        finalCompiledSource = generateBatchPythonWrapper(rawPythonSolutionCode, activeMetadata, returnType, localFunctionName, customJudgeType);
      }

      let runResult;
      try {
        const apiResponse = await axios.post(CONFIG.ONECOMPILER_API_URL, 
          { language: "python", stdin: stdinPayload, files: [{ name: "main.py", content: finalCompiledSource }] },
          { headers: { "content-type": "application/json", "X-RapidAPI-Key": CONFIG.API_KEY, "X-RapidAPI-Host": "onecompiler-apis.p.rapidapi.com" } }
        );
        runResult = apiResponse.data;
      } catch (apiError) {
        console.log(`\n❌ HTTP REQUEST FAILED ON BATCH ${Math.floor(batchStart / BATCH_SIZE) + 1}:`);
        console.error(apiError.response ? JSON.stringify(apiError.response.data, null, 2) : apiError.message);
        processingHalted = true;
        break;
      }

      if (runResult.stderr || runResult.exception) {
        console.log(`\n❌ COMPILATION OR RUNTIME FAULT DETECTED IN BATCH ${Math.floor(batchStart / BATCH_SIZE) + 1}:`);
        console.error(runResult.stderr || runResult.exception);
        processingHalted = true;
        break;
      }

      if (!runResult.stdout) {
        console.log(`\n❌ API ERROR: No standard output received in Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}.`);
        console.log("Raw Response Payload:", runResult);
        processingHalted = true;
        break;
      }
      
      totalExecutionTime += runResult.executionTime || 0;
      const stdoutBlocks = runResult.stdout.split("~CASE_START~").map((b) => b.trim()).filter(Boolean);

      for (let idx = 0; idx < batchCases.length; idx++) {
        const globalIdx = batchStart + idx;
        const originalCase = batchCases[idx];
        const caseResultBlock = stdoutBlocks[idx];
        const outputMatch = caseResultBlock ? caseResultBlock.match(/OUTPUT:\s*(.*)/) : null;
        const rawCaseStdout = outputMatch ? outputMatch[1].trim() : "";

        let passed = false;
        if (isStateful) {
          const expectedString = JSON.stringify(originalCase.expected);
          const cleanStdout = stripWhitespaceSafe(rawCaseStdout);
          const cleanExpected = stripWhitespaceSafe(expectedString);
          
          passed = (cleanStdout === cleanExpected);
          if (!passed) {
            console.log(`❌ Test Case [${globalIdx + 1}/${testSuiteCases.length}] FAILED validation.`);
            console.log(`   🚨 EXPECTED: ${cleanExpected}`);
            console.log(`   🛑 RECEIVED: ${cleanStdout}`);
          }
        } else {
          passed = !caseResultBlock.includes("STATUS: FAILED");
          if (!passed) {
            console.log(`❌ Test Case [${globalIdx + 1}/${testSuiteCases.length}] FAILED validation.`);
            console.log(`   🚨 INPUT: ${JSON.stringify(originalCase.inputs)}`);
            console.log(`   🎯 EXPECTED: ${JSON.stringify(originalCase.expected)}`);
          }
        }

        if (passed) {
          console.log(`✅ Test Case [${globalIdx + 1}/${testSuiteCases.length}] PASSED.`);
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
    }

    if (!processingHalted) {
      console.log("\n================ ENGINE RESULT METRICS ================");
      console.log(`⏱️ Total Execution Time : ${totalExecutionTime} ms`);
      console.log("=======================================================");
      console.log("💾 Updating verified test cases AND fixing metadata in Supabase...");
      const { error: updateError } = await supabase.from("problems").update({ test_cases: updatedDatabasePayload, metadata: activeMetadata }).eq("leetcode_id", CONFIG.PROBLEM_ID);
      if (updateError) throw updateError;
      console.log("🎉 Verification Complete! Database healed and updated successfully.");
    }
  } catch (error) {
    console.error(`\n🚨 CRITICAL ERROR: ${error.message}`);
  }
};

testHarnessPipeline();