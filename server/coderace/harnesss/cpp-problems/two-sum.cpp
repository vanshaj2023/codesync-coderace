#include <unordered_map>
#include <vector>

using namespace std;

class Solution {
public:
  vector<int> twoSum(vector<int> &nums, int target) {
    unordered_map<int, int> numMap;

    for (int i = 0; i < nums.size(); i++) {
      int complement = target - nums[i];

      // If complement is found, return indices immediately
      if (numMap.find(complement) != numMap.end()) {
        return {numMap[complement], i};
      }

      // Store index of the current number
      numMap[nums[i]] = i;
    }

    return {}; // Return empty fallback if no solution is found
  }
};
