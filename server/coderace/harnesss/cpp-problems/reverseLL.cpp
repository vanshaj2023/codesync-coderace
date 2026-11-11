class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        
        while (curr) {
            ListNode* nextTemp = curr->next; // Store next node
            curr->next = prev;               // Reverse current node's pointer
            prev = curr;                     // Move pointers one position ahead
            curr = nextTemp;
        }
        
        return prev;
    }
};