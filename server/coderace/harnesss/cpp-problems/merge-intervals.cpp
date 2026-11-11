#include <algorithm> // Required for std::sort

class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        if (intervals.empty()) return {};
        
        // Sort intervals based on the starting time
        sort(intervals.begin(), intervals.end());
        
        vector<vector<int>> merged;
        merged.push_back(intervals[0]);
        
        for (size_t i = 1; i < intervals.size(); i++) {
            // If the current interval overlaps with the last merged interval, update the end time
            if (intervals[i][0] <= merged.back()[1]) {
                merged.back()[1] = max(merged.back()[1], intervals[i][1]);
            } else {
                // Otherwise, it doesn't overlap, so add it to the list
                merged.push_back(intervals[i]);
            }
        }
        
        return merged;
    }
};