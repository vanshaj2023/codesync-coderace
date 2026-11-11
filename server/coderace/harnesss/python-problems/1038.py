class Solution:
    def bstToGst(self, root: TreeNode) -> TreeNode:
        self.running_sum = 0
        
        def reverse_inorder(node):
            if not node:
                return
            
            # Traverse right subtree first (greater values)
            reverse_inorder(node.right)
            
            # Update the running sum and the current node's value
            self.running_sum += node.val
            node.val = self.running_sum
            
            # Traverse left subtree (smaller values)
            reverse_inorder(node.left)
            
        reverse_inorder(root)
        return root