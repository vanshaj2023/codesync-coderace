class Solution {
public:
    unordered_map<Node*, Node*> mp;

    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;

        if (mp.count(node))
            return mp[node];

        Node* clone = new Node(node->val);
        mp[node] = clone;

        for (Node* nei : node->neighbors)
            clone->neighbors.push_back(cloneGraph(nei));

        return clone;
    }
};