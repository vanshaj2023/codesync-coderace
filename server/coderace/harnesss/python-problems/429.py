from typing import List, Optional
from collections import deque

class NaryNode:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

class Solution:
    def levelOrder(self, root: Optional['NaryNode']) -> List[List[int]]:
        if not root:
            return []
        
        result = []
        queue = deque([root])
        
        while queue:
            level_size = len(queue)
            current_level = []
            
            for _ in range(level_size):
                node = queue.popleft()
                current_level.append(node.val)
                # NaryNode stores children in a list, so we extend the queue
                queue.extend(node.children)
                
            result.append(current_level)
            
        return result