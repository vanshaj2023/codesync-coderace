#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
    vector<vector<int>> levelOrder(NaryNode* root) {
        if (!root) return {};
        
        vector<vector<int>> result;
        queue<NaryNode*> q;
        q.push(root);
        
        while (!q.empty()) {
            int currentLevelSize = q.size();
            vector<int> currentLevel;
            
            for (int i = 0; i < currentLevelSize; i++) {
                NaryNode* node = q.front();
                q.pop();
                
                currentLevel.push_back(node->val);
                
                // Push all children into the queue for the next level
                for (NaryNode* child : node->children) {
                    q.push(child);
                }
            }
            result.push_back(currentLevel);
        }
        
        return result;
    }
};