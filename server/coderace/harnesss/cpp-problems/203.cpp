class Solution {
public:
    DLLNode* removeElements(DLLNode* head, int val) {
        DLLNode* curr = head;
        
        while (curr != nullptr) {
            if (curr->val == val) {
                DLLNode* prevNode = curr->prev;
                DLLNode* nextNode = curr->next;
                
                // If the node to delete is NOT the head, wire the previous node forward
                if (prevNode != nullptr) {
                    prevNode->next = nextNode;
                } else {
                    // If it IS the head, the next node becomes the new head
                    head = nextNode;
                }
                
                // If the node to delete is NOT the tail, wire the next node backward
                if (nextNode != nullptr) {
                    nextNode->prev = prevNode;
                }
                
                // Move current forward to continue searching
                DLLNode* nodeToDelete = curr;
                curr = curr->next;
                
                // In a real memory-strict environment, we delete the orphaned node
                delete nodeToDelete; 
            } else {
                curr = curr->next;
            }
        }
        
        return head;
    }
};