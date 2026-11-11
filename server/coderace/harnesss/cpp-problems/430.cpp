class Solution {
public:
    Node* flatten(Node* head) {
        if (!head) return head;

        Node* curr = head;

        while (curr) {
            if (curr->child) {
                Node* next = curr->next;

                Node* childHead = flatten(curr->child);

                curr->next = childHead;
                childHead->prev = curr;
                curr->child = nullptr;

                Node* tail = childHead;
                while (tail->next)
                    tail = tail->next;

                tail->next = next;
                if (next)
                    next->prev = tail;
            }

            curr = curr->next;
        }

        return head;
    }
};