#include <vector>
#include <algorithm>

class Solution {
    vector<int> tree;

    void update(int node, int start, int end, int val_idx) {
        if (start == end) {
            tree[node]++;
            return;
        }
        int mid = start + (end - start) / 2;
        if (val_idx <= mid) {
            update(2 * node + 1, start, mid, val_idx);
        } else {
            update(2 * node + 2, mid + 1, end, val_idx);
        }
        tree[node] = tree[2 * node + 1] + tree[2 * node + 2];
    }

    int query(int node, int start, int end, int L, int R) {
        if (R < start || L > end) return 0;
        if (L <= start && end <= R) return tree[node];
        int mid = start + (end - start) / 2;
        return query(2 * node + 1, start, mid, L, R) + 
               query(2 * node + 2, mid + 1, end, L, R);
    }

public:
    vector<int> countSmaller(vector<int>& nums) {
        int n = nums.size();
        vector<int> res(n, 0);
        if (n == 0) return res;

        // Shift values to handle negative numbers in the segment tree array
        int min_val = *min_element(nums.begin(), nums.end());
        int max_val = *max_element(nums.begin(), nums.end());
        int offset = -min_val;
        int size = max_val + offset + 1;
        
        // Segment tree size is 4 * N
        tree.assign(4 * size, 0);

        // Traverse right to left
        for (int i = n - 1; i >= 0; i--) {
            int shifted_val = nums[i] + offset;
            // Query count of numbers strictly less than current number
            if (shifted_val > 0) {
                res[i] = query(0, 0, size - 1, 0, shifted_val - 1);
            }
            // Add current number to the segment tree
            update(0, 0, size - 1, shifted_val);
        }

        return res;
    }
};