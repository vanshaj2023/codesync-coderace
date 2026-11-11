from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def validate(node, low=-float('inf'), high=float('inf')):
            # An empty tree or reaching a leaf's end is valid
            if not node:
                return True
            
            # The current node's value must be strictly within the boundary
            if node.val <= low or node.val >= high:
                return False
            
            # Left subtree must be strictly less than the current node's value
            # Right subtree must be strictly greater than the current node's value
            return (validate(node.left, low, node.val) and 
                    validate(node.right, node.val, high))

        return validate(root)