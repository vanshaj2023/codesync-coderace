import java.util.*;

class Solution {
    public GraphNode cloneGraph(GraphNode node) {
        if (node == null) return null;
        
        // Map to keep track of already cloned nodes to prevent infinite loops
        Map<GraphNode, GraphNode> clonedMap = new HashMap<>();
        
        return dfs(node, clonedMap);
    }
    
    private GraphNode dfs(GraphNode node, Map<GraphNode, GraphNode> clonedMap) {
        // If the node was already cloned, return the clone from the map
        if (clonedMap.containsKey(node)) {
            return clonedMap.get(node);
        }
        
        // Create the clone for the current node
        GraphNode clone = new GraphNode(node.val);
        clonedMap.put(node, clone);
        
        // Iterate through the neighbors to clone them recursively
        for (GraphNode neighbor : node.neighbors) {
            clone.neighbors.add(dfs(neighbor, clonedMap));
        }
        
        return clone;
    }
}