class Solution {
public:
    int climbStairs(int n) {
        // Base cases
        if (n == 1) return 1;
        if (n == 2) return 2;
        
        // Naive recursion without memoization (The TLE trigger)
        return climbStairs(n - 1) + climbStairs(n - 2);
    }
};