class Solution {
    public DLLNode reverseDLL(DLLNode head) {
        if (head == null || head.next == null) {
            return head;
        }
        
        DLLNode curr = head;
        DLLNode temp = null;
        
        // Traverse the list and swap next and prev pointers for each node
        while (curr != null) {
            temp = curr.prev;
            curr.prev = curr.next;
            curr.next = temp;
            
            // Move to the "next" node (which is now stored in prev due to the swap)
            curr = curr.prev;
        }
        
        // Before changing the head, check for the cases like empty list and list with only one node
        // The temp pointer is currently at the second node of the reversed list
        if (temp != null) {
            head = temp.prev;
        }
        
        return head;
    }
}