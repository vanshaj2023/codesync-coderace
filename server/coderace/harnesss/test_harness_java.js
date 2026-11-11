import fs from "fs";
import path from "path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

console.log("☕ Initializing CodeRace Java Enterprise Testing Harness...");

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- LOCAL CONFIGURATION ---
const CONFIG = {
  PROBLEM_ID: 133, 
  JAVA_SOLUTION_FILE: "./java-problems/133.java", 
  TEST_CASES_FILE: "./java-problems/133-tests.json",     
  ONECOMPILER_API_URL: "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
  API_KEY: process.env.COMPILER_API_KEY ||  process.env.RAPIDAPI_KEY,
};

// 🔥 THE JAVA 100% UNIVERSAL MAP 
const javaToCanonicalMap = {
  "int": "integer", "long": "long", "double": "float", "String": "string", "boolean": "boolean", "char": "character",
  "int[]": "integer[]", "long[]": "long[]", "char[]": "character[]", "String[]": "string[]", "double[]": "float[]", "boolean[]": "boolean[]",
  "int[][]": "integer[][]", "long[][]": "long[][]", "char[][]": "character[][]", "String[][]": "string[][]", "boolean[][]": "boolean[][]", "double[][]": "float[][]",
  "List<Integer>": "integer[]", "List<Long>": "long[]", "List<String>": "string[]",
  "List<List<Integer>>": "integer[][]", "List<List<String>>": "string[][]",
  "ListNode": "linked_list", "TreeNode": "binary_tree", "GraphNode": "graph", "DLLNode": "dll", 
  "NaryNode": "nary_tree", "RandomNode": "random_list", "Pair<Integer, Integer>": "int_pair"
};

const normalizeJavaType = (typeStr) => typeStr ? typeStr.trim() : "";

const getCanonicalType = (rawType) => {
  if (!rawType) return "";
  let clean = rawType.replace(/\s/g, ""); 
  
  let exactMatch = Object.keys(javaToCanonicalMap).find(k => k.replace(/\s/g, "") === clean);
  if (exactMatch) return javaToCanonicalMap[exactMatch];

  const sortedKeys = Object.keys(javaToCanonicalMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key.replace(/\s/g, ""))) return javaToCanonicalMap[key];
  }
  return javaToCanonicalMap[rawType] || rawType;
};

// 🔥 THE BASE64 ENCODER
const encodeSafe = (v) => v === null || v === undefined ? "null" : "B64:" + Buffer.from(String(v)).toString('base64');

// ==========================================
// 1. STATELESS STDIN SERIALIZATION
// ==========================================
const serializeToStdin = (val, type) => {
  if (val === null || val === undefined) return "0";
  if (type === "boolean") return val ? "1" : "0";
  if (["integer", "long", "float"].includes(type)) return `${val}`;
  if (["string", "character"].includes(type)) return encodeSafe(val); 
  
  if (["integer[]", "long[]", "float[]", "boolean[]", "linked_list", "binary_tree", "dll", "nary_tree"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    return `${val.length} ${val.map((v) => (v === null ? "null" : (type === "boolean[]" ? (v ? "1" : "0") : v))).join(" ")}`;
  }
  
  if (["string[]", "character[]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    return `${val.length} ${val.map(encodeSafe).join(" ")}`; 
  }
  
  if (["integer[][]", "long[][]", "float[][]", "boolean[][]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    let result = `${val.length}`;
    for (const row of val) {
      if (!Array.isArray(row)) { result += " 0"; continue; }
      result += ` ${row.length} ` + row.map((v) => (v === null ? "null" : (type === "boolean[][]" ? (v ? "1" : "0") : v))).join(" ");
    }
    return result;
  }

  if (["string[][]", "character[][]"].includes(type)) {
    if (!Array.isArray(val)) return "0";
    let result = `${val.length}`;
    for (const row of val) {
      if (!Array.isArray(row)) { result += " 0"; continue; }
      result += ` ${row.length} ` + row.map(encodeSafe).join(" "); 
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
// 2A. STATELESS BATCH JAVA WRAPPER
// ==========================================
const generateBatchJavaWrapper = (userClassCode, metadata, returnType, functionName) => {
  const canonicalReturnType = getCanonicalType(returnType);
  const isVoid = canonicalReturnType === "void" || canonicalReturnType === "";
  
  const effectiveCanonicalReturnType = isVoid && metadata.parameters.length > 0 
    ? getCanonicalType(metadata.parameters[0].type) 
    : canonicalReturnType;
    
  const effectiveRawReturnType = isVoid && metadata.parameters.length > 0 
    ? metadata.parameters[0].type 
    : returnType;

  let code = `
import java.util.*;

class ListNode { int val; ListNode next; ListNode(int x) { val = x; next = null; } }
class TreeNode { int val; TreeNode left; TreeNode right; TreeNode(int x) { val = x; } }
class DLLNode { int val; DLLNode prev, next; DLLNode(int x) { val = x; } }
class GraphNode { int val; List<GraphNode> neighbors; GraphNode() { val = 0; neighbors = new ArrayList<>(); } GraphNode(int _val) { val = _val; neighbors = new ArrayList<>(); } }
class NaryNode { int val; List<NaryNode> children; NaryNode() { children = new ArrayList<>(); } NaryNode(int _val) { val = _val; children = new ArrayList<>(); } }
class RandomNode { int val; RandomNode next, random; RandomNode(int _val) { val = _val; } }
class Pair<K,V> { K key; V value; Pair(K k, V v) { key = k; value = v; } }

public class Main {
    static Scanner sc = new Scanner(System.in);

    static String readString() { String t = sc.next(); return t.equals("null") ? null : new String(Base64.getDecoder().decode(t.substring(4))); }
    static char readChar() { String t = sc.next(); return t.equals("null") ? ' ' : new String(Base64.getDecoder().decode(t.substring(4))).charAt(0); }

    static ListNode readLinkedList() { if (!sc.hasNextInt()) return null; int size = sc.nextInt(); if (size == 0) return null; ListNode head = new ListNode(sc.nextInt()); ListNode curr = head; for(int i=1; i<size; i++) { curr.next = new ListNode(sc.nextInt()); curr = curr.next; } return head; }
    static TreeNode readBinaryTree() { if (!sc.hasNextInt()) return null; int size = sc.nextInt(); if (size == 0) return null; String[] tokens = new String[size]; for(int i=0; i<size; i++) tokens[i] = sc.next(); if (tokens[0].equals("null")) return null; TreeNode root = new TreeNode(Integer.parseInt(tokens[0])); Queue<TreeNode> q = new LinkedList<>(); q.add(root); int i = 1; while(!q.isEmpty() && i < size) { TreeNode curr = q.poll(); if (i < size && !tokens[i].equals("null")) { curr.left = new TreeNode(Integer.parseInt(tokens[i])); q.add(curr.left); } i++; if (i < size && !tokens[i].equals("null")) { curr.right = new TreeNode(Integer.parseInt(tokens[i])); q.add(curr.right); } i++; } return root; }
    static DLLNode readDLL() { if (!sc.hasNextInt()) return null; int size = sc.nextInt(); if (size == 0) return null; DLLNode head = new DLLNode(sc.nextInt()); DLLNode curr = head; for(int i=1; i<size; i++) { DLLNode newNode = new DLLNode(sc.nextInt()); curr.next = newNode; newNode.prev = curr; curr = newNode; } return head; }
    static GraphNode readGraph() { if (!sc.hasNextInt()) return null; int n = sc.nextInt(); if (n == 0) return null; GraphNode[] nodes = new GraphNode[n + 1]; for (int i = 1; i <= n; ++i) nodes[i] = new GraphNode(i); for (int i = 1; i <= n; ++i) { int k = sc.nextInt(); for (int j = 0; j < k; ++j) { int nv = sc.nextInt(); nodes[i].neighbors.add(nodes[nv]); } } return n > 0 ? nodes[1] : null; }
    static NaryNode readNaryTree() { if (!sc.hasNextInt()) return null; int size = sc.nextInt(); if (size == 0) return null; String[] tokens = new String[size]; for(int i=0; i<size; i++) tokens[i] = sc.next(); if (tokens[0].equals("null")) return null; NaryNode root = new NaryNode(Integer.parseInt(tokens[0])); Queue<NaryNode> q = new LinkedList<>(); q.add(root); int i = 1; while(!q.isEmpty() && i < size) { NaryNode curr = q.poll(); if (i < size && tokens[i].equals("null")) i++; while(i < size && !tokens[i].equals("null")) { NaryNode child = new NaryNode(Integer.parseInt(tokens[i++])); curr.children.add(child); q.add(child); } } return root; }
    static RandomNode readRandomList() { if (!sc.hasNextInt()) return null; int size = sc.nextInt(); if (size == 0) return null; RandomNode[] nodes = new RandomNode[size]; String[] randomIdx = new String[size]; for(int i=0; i<size; i++) { nodes[i] = new RandomNode(sc.nextInt()); randomIdx[i] = sc.next(); if(i > 0) nodes[i-1].next = nodes[i]; } for(int i=0; i<size; i++) { if(!randomIdx[i].equals("null")) nodes[i].random = nodes[Integer.parseInt(randomIdx[i])]; } return size > 0 ? nodes[0] : null; }

    static void printOutput(int val) { System.out.print(val); }
    static void printOutput(long val) { System.out.print(val); }
    static void printOutput(double val) { System.out.print(val); }
    static void printOutput(boolean val) { System.out.print(val ? "true" : "false"); }
    static void printOutput(char val) { System.out.print("\\"" + val + "\\""); }
    static void printOutput(String val) { System.out.print("\\"" + val + "\\""); }
    
    // 🔥 NULL-SAFE 1D Arrays
    static void printOutput(int[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(long[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(double[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(boolean[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print((arr[i] ? "true" : "false") + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(char[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { printOutput(arr[i]); System.out.print(i == arr.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(String[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { printOutput(arr[i]); System.out.print(i == arr.length-1 ? "" : ","); } System.out.print("]"); }
    
    // 🔥 NULL-SAFE 2D Matrices
    static void printOutput(int[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(long[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(double[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(boolean[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(char[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(String[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }

    // 🔥 CYCLE-SAFE Node Printers
    static void printOutput(ListNode node) { System.out.print("["); Set<ListNode> v = new HashSet<>(); while(node != null) { if(v.contains(node)) { System.out.print("CYCLE_DETECTED"); break; } v.add(node); System.out.print(node.val + (node.next != null ? "," : "")); node = node.next; } System.out.print("]"); }
    static void printOutput(DLLNode node) { System.out.print("["); Set<DLLNode> v = new HashSet<>(); while(node != null) { if(v.contains(node)) { System.out.print("CYCLE_DETECTED"); break; } v.add(node); System.out.print(node.val + (node.next != null ? "," : "")); node = node.next; } System.out.print("]"); }
    static void printOutput(RandomNode node) { System.out.print("["); Set<RandomNode> v = new HashSet<>(); while(node != null) { if(v.contains(node)) { System.out.print("CYCLE_DETECTED"); break; } v.add(node); System.out.print("[" + node.val + "," + (node.random != null ? String.valueOf(node.random.val) : "null") + "]" + (node.next != null ? "," : "")); node = node.next; } System.out.print("]"); }

    static void printOutput(TreeNode node) { if (node == null) System.out.print("[]"); else System.out.print("[Tree Root " + node.val + "]"); }
    static void printOutput(GraphNode node) { if (node == null) System.out.print("[]"); else System.out.print("[Graph Node " + node.val + "]"); }
    static void printOutput(NaryNode node) { if (node == null) System.out.print("[]"); else System.out.print("[Nary Root " + node.val + "]"); }
    static <K,V> void printOutput(Pair<K,V> p) { if(p==null){System.out.print("null");return;} System.out.print("[" + p.key + "," + p.value + "]"); }
    static void printOutput(List<?> list) { if(list==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<list.size(); i++) { Object o = list.get(i); if (o instanceof List) printOutput((List<?>)o); else if (o instanceof String) printOutput((String)o); else if (o instanceof Character) printOutput((Character)o); else System.out.print(o); System.out.print(i == list.size()-1 ? "" : ","); } System.out.print("]"); }

    static boolean checkExpected(int a, int b) { return a == b; }
    static boolean checkExpected(long a, long b) { return a == b; }
    static boolean checkExpected(boolean a, boolean b) { return a == b; }
    static boolean checkExpected(String a, String b) { if(a==null||b==null) return a==b; return a.equals(b); }
    static boolean checkExpected(double a, double b) { return Math.abs(a - b) < 1e-5; }
    
    // 🔥 NULL-SAFE Array Comparators
    static boolean checkExpected(int[] a, int[] b) { return Arrays.equals(a, b); }
    static boolean checkExpected(long[] a, long[] b) { return Arrays.equals(a, b); }
    static boolean checkExpected(boolean[] a, boolean[] b) { return Arrays.equals(a, b); }
    static boolean checkExpected(char[] a, char[] b) { return Arrays.equals(a, b); }
    static boolean checkExpected(String[] a, String[] b) { return Arrays.equals(a, b); }
    static boolean checkExpected(double[] a, double[] b) { if(a==null||b==null) return a==b; if(a.length != b.length) return false; for(int i=0; i<a.length; i++) if(!checkExpected(a[i], b[i])) return false; return true; }
    
    static boolean checkExpected(int[][] a, int[][] b) { return Arrays.deepEquals(a, b); }
    static boolean checkExpected(long[][] a, long[][] b) { return Arrays.deepEquals(a, b); }
    static boolean checkExpected(boolean[][] a, boolean[][] b) { return Arrays.deepEquals(a, b); }
    static boolean checkExpected(char[][] a, char[][] b) { return Arrays.deepEquals(a, b); }
    static boolean checkExpected(String[][] a, String[][] b) { return Arrays.deepEquals(a, b); }
    static boolean checkExpected(double[][] a, double[][] b) { if(a==null||b==null) return a==b; if(a.length != b.length) return false; for(int i=0; i<a.length; i++) if(!checkExpected(a[i], b[i])) return false; return true; }

    static boolean checkExpected(List<?> a, List<?> b) { if(a==null||b==null) return a==b; return a.equals(b); }
    
    // 🔥 CYCLE-SAFE Node Comparators
    static boolean checkExpected(ListNode a, ListNode b) { Set<ListNode> vA = new HashSet<>(); Set<ListNode> vB = new HashSet<>(); while(a != null && b != null) { if(vA.contains(a) && vB.contains(b)) return true; if(vA.contains(a) || vB.contains(b) || a.val != b.val) return false; vA.add(a); vB.add(b); a = a.next; b = b.next; } return a == null && b == null; }
    static boolean checkExpected(RandomNode a, RandomNode b) { Set<RandomNode> vA = new HashSet<>(); Set<RandomNode> vB = new HashSet<>(); while(a != null && b != null) { if(vA.contains(a) && vB.contains(b)) return true; if(vA.contains(a) || vB.contains(b) || a.val != b.val) return false; if((a.random == null) != (b.random == null)) return false; if(a.random != null && a.random.val != b.random.val) return false; vA.add(a); vB.add(b); a = a.next; b = b.next; } return a == null && b == null; }
    
    static boolean checkExpected(TreeNode a, TreeNode b) { if(a == null && b == null) return true; if(a == null || b == null || a.val != b.val) return false; return checkExpected(a.left, b.left) && checkExpected(a.right, b.right); }
    static <K,V> boolean checkExpected(Pair<K,V> a, Pair<K,V> b) { if(a==null||b==null) return a==b; return a.key.equals(b.key) && a.value.equals(b.value); }
    static boolean checkExpected(GraphNode res, GraphNode exp) { if (res == null && exp == null) return true; if (res == null || exp == null) return false; Map<GraphNode, GraphNode> visited = new HashMap<>(); Queue<GraphNode[]> q = new LinkedList<>(); q.add(new GraphNode[]{res, exp}); visited.put(res, exp); while(!q.isEmpty()) { GraphNode[] curr = q.poll(); GraphNode r = curr[0], e = curr[1]; if (r.val != e.val || r.neighbors.size() != e.neighbors.size()) return false; for(int i=0; i<r.neighbors.size(); i++) { GraphNode rN = r.neighbors.get(i), eN = e.neighbors.get(i); if (visited.containsKey(rN)) { if (visited.get(rN) != eN) return false; } else { visited.put(rN, eN); q.add(new GraphNode[]{rN, eN}); } } } return true; }
    static boolean checkExpected(NaryNode a, NaryNode b) { if(a == null && b == null) return true; if(a == null || b == null || a.val != b.val || a.children.size() != b.children.size()) return false; for(int i=0; i<a.children.size(); i++) { if(!checkExpected(a.children.get(i), b.children.get(i))) return false; } return true; }

    public static void main(String[] args) {
        if (!sc.hasNextInt()) return;
        int totalCases = sc.nextInt();
        Solution obj = new Solution();
        
        for (int t = 0; t < totalCases; t++) {
            System.out.println("~CASE_START~");
`;
  
  const args = [];
  metadata.parameters.forEach((param, idx) => {
    const varName = `arg_${idx}`;
    args.push(varName);
    code += generateTypeParserJava(getCanonicalType(param.type), param.type, varName, "            ");
  });
  
  code += `\n            int has_expected_check = sc.nextInt();\n`;
  code += generateTypeParserJava(effectiveCanonicalReturnType, effectiveRawReturnType, "expected_val", "            ");
  
  if (isVoid) {
    code += `
            obj.${functionName}(${args.join(", ")});
            System.out.print("OUTPUT: "); printOutput(arg_0); System.out.println();
            if (has_expected_check == 1) {
                if (!checkExpected(arg_0, expected_val)) { System.out.println("STATUS: FAILED\\n~CASE_END~"); return; }
            }
    `;
  } else {
    code += `
            ${returnType} result = obj.${functionName}(${args.join(", ")});
            System.out.print("OUTPUT: "); printOutput(result); System.out.println();
            if (has_expected_check == 1) {
                if (!checkExpected(result, expected_val)) { System.out.println("STATUS: FAILED\\n~CASE_END~"); return; }
            }
    `;
  }

  code += `
            System.out.println("STATUS: PASSED\\n~CASE_END~");
        }
    }
}

${userClassCode}
`;
  return code;
};

const generateTypeParserJava = (type, rawType, varName, tab) => {
  if (type === "integer") return `${tab}int ${varName} = sc.nextInt();\n`;
  if (type === "long") return `${tab}long ${varName} = sc.nextLong();\n`;
  if (type === "float") return `${tab}double ${varName} = sc.nextDouble();\n`;
  if (type === "string") return `${tab}String ${varName} = readString();\n`; 
  if (type === "character") return `${tab}char ${varName} = readChar();\n`; 
  if (type === "boolean") return `${tab}boolean ${varName} = (sc.nextInt() == 1);\n`;
  
  if (type === "linked_list") return `${tab}ListNode ${varName} = readLinkedList();\n`;
  if (type === "binary_tree") return `${tab}TreeNode ${varName} = readBinaryTree();\n`;
  if (type === "dll") return `${tab}DLLNode ${varName} = readDLL();\n`;
  if (type === "graph") return `${tab}GraphNode ${varName} = readGraph();\n`;
  if (type === "nary_tree") return `${tab}NaryNode ${varName} = readNaryTree();\n`;
  if (type === "random_list") return `${tab}RandomNode ${varName} = readRandomList();\n`;
  
  if (["integer[]", "long[]", "float[]", "string[]", "character[]", "boolean[]"].includes(type)) {
    const isList = rawType && rawType.includes("List");
    let innerType = "int"; let objType = "Integer"; let reader = "sc.nextInt()";
    if (type === "long[]") { innerType = "long"; objType = "Long"; reader = "sc.nextLong()"; }
    if (type === "float[]") { innerType = "double"; objType = "Double"; reader = "sc.nextDouble()"; }
    if (type === "string[]") { innerType = "String"; objType = "String"; reader = "readString()"; }
    if (type === "character[]") { innerType = "char"; objType = "Character"; reader = "readChar()"; }
    if (type === "boolean[]") { innerType = "boolean"; objType = "Boolean"; reader = "(sc.nextInt() == 1)"; }
    
    if (isList) {
      return `${tab}int size_${varName} = sc.nextInt();\n${tab}List<${objType}> ${varName} = new ArrayList<>();\n${tab}for(int j=0; j<size_${varName}; j++) ${varName}.add(${reader});\n`;
    } else {
      return `${tab}int size_${varName} = sc.nextInt();\n${tab}${innerType}[] ${varName} = new ${innerType}[size_${varName}];\n${tab}for(int j=0; j<size_${varName}; j++) ${varName}[j] = ${reader};\n`;
    }
  }
  
  if (["integer[][]", "long[][]", "float[][]", "string[][]", "character[][]", "boolean[][]"].includes(type)) {
    const isList = rawType && rawType.includes("List");
    let innerType = "int"; let objType = "Integer"; let reader = "sc.nextInt()";
    if (type === "long[][]") { innerType = "long"; objType = "Long"; reader = "sc.nextLong()"; }
    if (type === "float[][]") { innerType = "double"; objType = "Double"; reader = "sc.nextDouble()"; }
    if (type === "string[][]") { innerType = "String"; objType = "String"; reader = "readString()"; }
    if (type === "character[][]") { innerType = "char"; objType = "Character"; reader = "readChar()"; }
    if (type === "boolean[][]") { innerType = "boolean"; objType = "Boolean"; reader = "(sc.nextInt() == 1)"; }
    
    if (isList) {
      return `${tab}int r_${varName} = sc.nextInt();\n${tab}List<List<${objType}>> ${varName} = new ArrayList<>();\n${tab}for(int i=0; i<r_${varName}; i++) { int c_${varName} = sc.nextInt(); List<${objType}> row = new ArrayList<>(); for(int j=0; j<c_${varName}; j++) row.add(${reader}); ${varName}.add(row); }\n`;
    } else {
      return `${tab}int r_${varName} = sc.nextInt();\n${tab}${innerType}[][] ${varName} = new ${innerType}[r_${varName}][];\n${tab}for(int i=0; i<r_${varName}; i++) { int c_${varName} = sc.nextInt(); ${varName}[i] = new ${innerType}[c_${varName}]; for(int j=0; j<c_${varName}; j++) ${varName}[i][j] = ${reader}; }\n`;
    }
  }
  return "";
};

// ==========================================
// 2B. STATEFUL (OOP) BATCH JAVA WRAPPER
// ==========================================
const generateOopJavaWrapper = (userClassCode, testSuiteCases) => {
  let code = `
import java.util.*;

public class Main {
    static void printOutput(int val) { System.out.print(val); }
    static void printOutput(long val) { System.out.print(val); }
    static void printOutput(double val) { System.out.print(val); }
    static void printOutput(boolean val) { System.out.print(val ? "true" : "false"); }
    static void printOutput(char val) { System.out.print("\\"" + val + "\\""); }
    static void printOutput(String val) { System.out.print("\\"" + val + "\\""); }

    static void printOutput(int[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(long[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(double[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print(arr[i] + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(boolean[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { System.out.print((arr[i] ? "true" : "false") + (i == arr.length-1 ? "" : ",")); } System.out.print("]"); }
    static void printOutput(char[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { printOutput(arr[i]); System.out.print(i == arr.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(String[] arr) { if(arr==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<arr.length; i++) { printOutput(arr[i]); System.out.print(i == arr.length-1 ? "" : ","); } System.out.print("]"); }
    
    static void printOutput(int[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(long[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(double[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(boolean[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(char[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }
    static void printOutput(String[][] mat) { if(mat==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<mat.length; i++) { printOutput(mat[i]); System.out.print(i == mat.length-1 ? "" : ","); } System.out.print("]"); }

    static void printOutput(List<?> list) { if(list==null){System.out.print("null");return;} System.out.print("["); for(int i=0; i<list.size(); i++) { Object o = list.get(i); if (o instanceof List) printOutput((List<?>)o); else if (o instanceof String) printOutput((String)o); else if (o instanceof Character) printOutput((Character)o); else System.out.print(o); System.out.print(i == list.size()-1 ? "" : ","); } System.out.print("]"); }

    public static void main(String[] args) {
`;
  testSuiteCases.forEach((tc, idx) => {
    const className = tc.commands[0];
    const constructorArgs = tc.args[0].join(', ');
    
    code += `        System.out.print("~CASE_START~\\nOUTPUT: [null");\n`;
    code += `        ${className} obj_${idx} = new ${className}(${constructorArgs});\n`;
    for (let i = 1; i < tc.commands.length; i++) {
      let cmd = tc.commands[i];
      let argStr = tc.args[i].map(a => typeof a === 'string' ? `"${a}"` : a).join(', ');
      code += `        System.out.print(",");\n`;
      if (tc.expected[i] === null) {
        code += `        obj_${idx}.${cmd}(${argStr}); System.out.print("null");\n`;
      } else {
        code += `        printOutput(obj_${idx}.${cmd}(${argStr}));\n`;
      }
    }
    code += `        System.out.println("]\\n~CASE_END~");\n`;
  });
  code += `    }\n}\n\n${userClassCode}\n`;
  return code;
};

// ==========================================
// 3. EXECUTION AND ROUTING ENGINE
// ==========================================
const testHarnessPipeline = async () => {
  try {
    const { data: problem, error: dbError } = await supabase.from("problems").select("id, title, metadata").eq("leetcode_id", CONFIG.PROBLEM_ID).single();
    if (dbError || !problem) throw new Error(`Problem ID ${CONFIG.PROBLEM_ID} missing from database.`);
    if (!fs.existsSync(CONFIG.JAVA_SOLUTION_FILE)) throw new Error(`Solution missing: ${CONFIG.JAVA_SOLUTION_FILE}`);
    if (!fs.existsSync(CONFIG.TEST_CASES_FILE)) throw new Error(`Tests config file missing: ${CONFIG.TEST_CASES_FILE}`);

    const rawJavaSolutionCode = fs.readFileSync(CONFIG.JAVA_SOLUTION_FILE, "utf-8");
    
    const cleanJavaSolutionCode = rawJavaSolutionCode
      .replace(/^(import|package)\s+.*?;/gm, "")
      .replace(/public\s+class/g, "class")
      .trim();
      
    const testSuiteCases = JSON.parse(fs.readFileSync(CONFIG.TEST_CASES_FILE, "utf-8"));

    const isStateful = testSuiteCases[0].commands !== undefined;
    let finalCompiledSource = "";
    let stdinPayload = "";
    let activeMetadata = problem.metadata;

    if (isStateful) {
      console.log(`\n🔥 Processing Dynamic OOP (Stateful) Java Suite: "${problem.title}"`);
      finalCompiledSource = generateOopJavaWrapper(cleanJavaSolutionCode, testSuiteCases);
    } else {
      console.log(`\n🔥 Processing Dynamic Stateless Java Suite: "${problem.title}"`);
      
      const matchSignature = cleanJavaSolutionCode.match(/public\s+([\w<>, \[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
      if (!matchSignature) throw new Error("Could not parse method signature from Java file.");

      const returnType = normalizeJavaType(matchSignature[1]);
      const localFunctionName = matchSignature[2];
      const localParameters = matchSignature[3].trim() === "" ? [] : matchSignature[3].split(",").map(arg => {
        const parts = arg.trim().split(/\s+/);
        let name = parts.pop(); let rawType = parts.join(" ");
        return { name, type: normalizeJavaType(rawType) };
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
      finalCompiledSource = generateBatchJavaWrapper(cleanJavaSolutionCode, activeMetadata, returnType, localFunctionName);
    }

    console.log(`   📡 Shipping Java payload to OneCompiler API...`);
    const runResult = (await axios.post(CONFIG.ONECOMPILER_API_URL, 
      { language: "java", stdin: stdinPayload, files: [{ name: "Main.java", content: finalCompiledSource }] },
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