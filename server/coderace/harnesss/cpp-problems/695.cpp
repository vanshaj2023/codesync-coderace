#include <vector>
#include <algorithm>

class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& grid) {
        int max_area = 0;
        int m = grid.size();
        int n = grid[0].size();
        
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // When we find an unvisited piece of land, explore the whole island
                if (grid[i][j] == 1) {
                    max_area = max(max_area, dfs(grid, i, j, m, n));
                }
            }
        }
        
        return max_area;
    }
    
private:
    int dfs(vector<vector<int>>& grid, int r, int c, int m, int n) {
        // Boundary checks and water/visited check
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] == 0) {
            return 0;
        }
        
        // 🚨 THE FIX 🚨
        // Mark as visited IMMEDIATELY to prevent infinite loops and memory explosion
        grid[r][c] = 0;
        
        // Accumulate area: 1 (current cell) + area of all 4 adjacent directions
        return 1 + dfs(grid, r + 1, c, m, n)
                 + dfs(grid, r - 1, c, m, n)
                 + dfs(grid, r, c + 1, m, n)
                 + dfs(grid, r, c - 1, m, n);
    }
};