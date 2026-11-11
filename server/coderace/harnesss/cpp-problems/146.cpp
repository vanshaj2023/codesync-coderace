#include <unordered_map>
#include <list>
using namespace std;

class LRUCache {
    int capacity;
    // DLL to store {key, value} pairs. Front is most recent.
    list<pair<int, int>> dll; 
    // Map to store key -> pointer to the DLL node
    unordered_map<int, list<pair<int, int>>::iterator> cache;

public:
    LRUCache(int capacity) {
        this->capacity = capacity;
    }
    
    int get(int key) {
        if (cache.find(key) == cache.end()) {
            return -1; // Not found
        }
        
        // Move the accessed node to the front (most recently used)
        dll.splice(dll.begin(), dll, cache[key]);
        return cache[key]->second;
    }
    
    void put(int key, int value) {
        if (cache.find(key) != cache.end()) {
            // Key exists: update value and move to front
            cache[key]->second = value;
            dll.splice(dll.begin(), dll, cache[key]);
            return;
        }
        
        // Key doesn't exist: check capacity
        if (dll.size() == capacity) {
            // Evict the least recently used (back of the list)
            int lru_key = dll.back().first;
            dll.pop_back();
            cache.erase(lru_key);
        }
        
        // Insert new node at the front
        dll.push_front({key, value});
        cache[key] = dll.begin();
    }
};