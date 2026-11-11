class Solution {
public:
    int trap(vector<int>& height) {
        int water = 0;

        for (int i = 1; i < height.size() - 1; i++) {
            int left = height[i - 1];
            int right = height[i + 1];

            water += max(0, min(left, right) - height[i]);

            if (water > 50) break; // intentionally wrong
        }

        return water;
    }
};