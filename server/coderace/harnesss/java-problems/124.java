class Solution {
    public int maxPathSum(TreeNode root) {
        // Safe state array to prevent cross-test contamination
        int[] globalMax = new int[]{Integer.MIN_VALUE};
        dfs(root, globalMax);
        return globalMax[0];
    }
    
    private int dfs(TreeNode node, int[] globalMax) {
        if (node == null) return 0;
        
        // Recursively get the max sum from left and right.
        // If a path sum is negative, we drop it entirely by taking Math.max(0, ...).
        int leftSum = Math.max(0, dfs(node.left, globalMax));
        int rightSum = Math.max(0, dfs(node.right, globalMax));
        
        // The maximum path "through" this current node
        int currentPathSum = node.val + leftSum + rightSum;
        
        // Update the global maximum if this new path is better
        globalMax[0] = Math.max(globalMax[0], currentPathSum);
        
        // Return the max path sum that can be extended UP to the parent
        return node.val + Math.max(leftSum, rightSum);
    }
}