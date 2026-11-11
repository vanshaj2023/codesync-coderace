#include <algorithm>

using namespace std;

class Solution {
public:
  int maxDepth(TreeNode *root) {
    // Base case: an empty tree has a depth of 0
    if (!root)
      return 0;

    // Recursively find the depth of left and right subtrees
    int leftDepth = maxDepth(root->left);
    int rightDepth = maxDepth(root->right);

    // The total depth is the max of the two halves plus the root node itself
    return max(leftDepth, rightDepth) + 1;
  }
};
