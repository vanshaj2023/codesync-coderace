class Solution {
public:
    Node* sortedInsert(Node* head, int data) {
        Node* newNode = new Node(data);

        if (!head)
            return newNode;

        if (data <= head->data) {
            newNode->next = head;
            head->prev = newNode;
            return newNode;
        }

        Node* curr = head;

        while (curr->next && curr->next->data < data)
            curr = curr->next;

        newNode->next = curr->next;
        newNode->prev = curr;

        if (curr->next)
            curr->next->prev = newNode;

        curr->next = newNode;

        return head;
    }
};