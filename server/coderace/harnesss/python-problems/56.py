from typing import List

class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        if not intervals:
            return []
            
        # Sort intervals based on the start time
        intervals.sort(key=lambda x: x[0])
        
        merged = [intervals[0]]
        
        for current in intervals[1:]:
            prev = merged[-1]
            
            # If the current interval overlaps with the previous, merge them
            if current[0] <= prev[1]:
                prev[1] = max(prev[1], current[1])
            else:
                # No overlap, add to the merged list
                merged.append(current)
                
        return merged