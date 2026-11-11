class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(numCourses);
        vector<int> indegree(numCourses, 0);
        
        // Build Adjacency List and Indegree array
        for (auto& pre : prerequisites) {
            adj[pre[1]].push_back(pre[0]);
            indegree[pre[0]]++;
        }
        
        // Kahn's Algorithm (BFS Topological Sort)
        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) q.push(i);
        }
        
        int coursesTaken = 0;
        while (!q.empty()) {
            int curr = q.front();
            q.pop();
            coursesTaken++;
            
            for (int next : adj[curr]) {
                if (--indegree[next] == 0) {
                    q.push(next);
                }
            }
        }
        
        return coursesTaken == numCourses;
    }
};