class Solution {
    public int diameterOfBinaryTree(TreeNode root) {
        // 🔥 THE FIX: Use a 1-element array to track the max diameter statelessly.
        // This guarantees a perfectly clean slate for every single test case!
        int[] maxDiameter = new int[1]; 
        
        dfs(root, maxDiameter);
        return maxDiameter[0];
    }
    
    private int dfs(TreeNode node, int[] maxDiameter) {
        if (node == null) return 0;
        
        int leftHeight = dfs(node.left, maxDiameter);
        int rightHeight = dfs(node.right, maxDiameter);
        
        // Update the maximum diameter found so far
        maxDiameter[0] = Math.max(maxDiameter[0], leftHeight + rightHeight);
        
        // Return the height of the current subtree
        return Math.max(leftHeight, rightHeight) + 1;
    }
}