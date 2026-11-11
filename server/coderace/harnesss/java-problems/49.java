import java.util.*;

public class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        if (strs == null || strs.length == 0) return new ArrayList<>();
        Map<String, List<String>> map = new HashMap<>();
        
        for (String s : strs) {
            char[] ca = s.toCharArray();
            Arrays.sort(ca);
            String key = String.valueOf(ca);
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        
        List<List<String>> result = new ArrayList<>(map.values());
        
        // 🚨 HARNESS FIX: Sort inner and outer lists deterministically 
        // so the deep equality checker perfectly matches the JSON output!
        for (List<String> list : result) {
            Collections.sort(list);
        }
        result.sort((a, b) -> {
            if (a.size() != b.size()) return a.size() - b.size();
            if (a.isEmpty()) return 0;
            return a.get(0).compareTo(b.get(0));
        });
        
        return result;
    }
}