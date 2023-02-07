#include <cstddef>
#include <memory.h>
#include <iostream>

#define BT_ORDER 6
#define BT_MIN_KEYS (BT_ORDER - 1) / 2
#define BT_MAX_KEYS BT_ORDER - 1
#define BT_KEY_TYPE int
#define BT_KEY_DATA_TYPE int

struct BTKey {
    BT_KEY_TYPE value;
    BT_KEY_DATA_TYPE data;
};

struct BTNode {
    BTKey keys[BT_MAX_KEYS];
    int keys_count = 0;

    BTNode* children[BT_MAX_KEYS];
    int children_count = 0;

    BTNode* parent = nullptr;
};

struct BTreeTraversalResult {
    int index;
    BTNode* node;
};

int binary_search(const BTNode* node, BT_KEY_TYPE value) {
    int start = 0;
    int end = node->keys_count - 1;
    int mid = (start + end) / 2;

    while (start <= end) {
        if (node->keys[mid].value == value) {
            return mid;
        } else if (node->keys[mid].value < value) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
        
        mid = (start + end) / 2;
    }

    return start;
}

class BTree {
    public:
        BTree() {
            root = new BTNode();
        }

        void insert(int key_value, BT_KEY_DATA_TYPE data) {
            BTreeTraversalResult result;
            result.node = root;
            result.index = 0;

            if (result.node->keys_count >= BT_MAX_KEYS) {
                result.node = split_node(result.node, result.index);
            }

            while (result.node->children_count != 0) {
                traverse_node(key_value, result.node, &result);

                if (result.node->keys_count >= BT_MAX_KEYS) {
                    result.node = split_node(result.node, result.index);
                    continue;
                }
            }

            BTKey key;
            key.value = key_value;
            key.data = data;

            insert_key_at(result.node, key, binary_search(result.node, key_value));
        }

        bool has(int key_value) {
            BTreeTraversalResult result;
            return find_node(key_value, &result);
        }

        BTNode* root;

    private:
        static bool traverse_node(BT_KEY_TYPE value, BTNode* node, BTreeTraversalResult* out) {
            if (node->children_count == 0) return false;
            if (value < node->keys[0].value) {
                out->index = 0;
                out->node = node->children[0];
                return true;
            }

            else if (value > node->keys[node->keys_count - 1].value) {
                out->index = node->children_count - 1;
                out->node = node->children[node->children_count - 1];
                return true;
            }

            else {
                int child_index = binary_search(node, value);
                out->index = child_index;
                out->node = node->children[child_index];
                return true;
            }
        }

        static void merge_nodes(BTNode* node, BTNode* node2, int node2_child_index) {
            for (int i = 0; i < node2->children_count; i++) {
                node2->children[i]->parent = node;
            }

            memcpy(node->keys + node->keys_count, node2->keys, node2->keys_count * sizeof(BTKey));
            memcpy(node->children + node->children_count, node2->children, node2->children_count * sizeof(size_t));
            node->keys_count += node2->keys_count;
            node->children_count += node2->children_count;

            remove_child_at(node->parent, node2_child_index);

            delete node2;
        }

        static BTNode* split_node(BTNode* node, int child_index) {
            int middle_index = node->keys_count / 2;

            if (node->parent == nullptr) {
                BTNode* child1 = new BTNode();
                child1->parent = node;
                child1->keys_count = middle_index;
                memcpy(child1->keys, node->keys, middle_index * sizeof(BTKey));

                BTNode* child2 = new BTNode();
                child2->parent = node;
                child2->keys_count = node->keys_count - middle_index - 1; // TODO - check if correct
                memcpy(child2->keys, node->keys + middle_index + 1, (node->keys_count - middle_index - 1) * sizeof(BTKey));

                node->keys[0] = node->keys[middle_index];
                node->keys_count = 1;

                if (node->children_count != 0) {
                    int childrenShare = node->children_count / 2; 

                    memcpy(child1->children, node->children, childrenShare * sizeof(size_t)); // TODO - check if correct
                    memcpy(child2->children, node->children + childrenShare, (node->children_count - childrenShare) * sizeof(size_t));
                    child1->children_count = childrenShare;
                    child2->children_count = node->children_count - childrenShare;

                    for (int i = 0; i < child1->children_count; i++) {
                        child1->children[i]->parent = child1;
                    }

                    for (int i = 0; i < child2->children_count; i++) {
                        child2->children[i]->parent = child2;
                    }
                }

                node->children[0] = child1;
                node->children[1] = child2;
                node->children_count = 2;

                return node;
            } else {
                insert_key_at(node->parent, node->keys[middle_index], binary_search(node->parent, node->keys[middle_index].value));

                BTNode* child = new BTNode();
                child->parent = node->parent;
                child->keys_count = node->keys_count - middle_index - 1;
                memcpy(child->keys, node->keys + middle_index + 1, (node->keys_count - middle_index - 1) * sizeof(BTKey));

                if (node->children_count != 0) {
                    int childrenShare = node->children_count / 2;

                    memcpy(child->children, node->children + childrenShare, (node->children_count - childrenShare) * sizeof(size_t));
                    child->children_count = node->children_count - childrenShare;

                    for (int i = 0; i < child->children_count; i++) {
                        child->children[i]->parent = child;
                    }

                    node->children_count -= child->children_count;
                }

                insert_child_at(node->parent, child, child_index + 1);

                node->keys_count -= child->keys_count + 1;

                return node->parent;
            }
        }

        bool find_node(int key_value, BTreeTraversalResult* out) {
            out->node = root;
            out->index = 0;
            bool result;

            do {
                // TODO - use binary search instead of searching for key manually
                // also improve it to be smarter
                for (int i = 0; i < out->node->keys_count; i++) {
                    if (out->node->keys[i].value == key_value) {
                        return true;
                    }
                }

                result = traverse_node(key_value, out->node, out);
            } while (result == true);

            return false;
        }

        inline int get_separator_key_index(int node_index, bool direction) {
            if (node_index == 0) return 0;
            else return node_index - !direction;
        }

        inline int get_successor_index(int key_index, bool direction) {
            if (key_index == 0) return direction - 0;
            else return (key_index + 1) - !direction;
        }

        static void insert_key_at(BTNode* node, const BTKey& key, int index) {
            if (index == node->keys_count) {
                node->keys[index] = key;
                node->keys_count++;
            } else {
                // Move the bytes to the right to make space.
                memmove((void*)(node->keys + index + 1), node->keys + index, (node->keys_count - index) * sizeof(BTKey));

                // Copy the key to the index position.
                node->keys[index] = key;

                node->keys_count++;
            }
        }

        static void remove_key_at(BTNode *node, int index) {
            if (index == node->keys_count - 1) {
                node->keys_count--;
            } else {
                memmove((void*)(node->keys + index), (void*)(node->keys + index + 1), (node->keys_count - index - 1) * sizeof(BTKey));
                node->keys_count--;
            }
        }

        static void insert_child_at(BTNode* node, BTNode* child, int index) {
            if (index == node->children_count) {
                node->children[index] = child;
                node->children_count++;
            } else {
                // Move the bytes to the right to make space.
                memmove((void*)(node->children + index + 1), node->children + index, (node->keys_count - index) * sizeof(BTNode));

                // Copy the key to the index position.
                node->children[index] = child;

                node->children_count++;
            }
        }

        static void remove_child_at(BTNode *node, int index) {
            if (index == node->children_count - 1) {
                node->children_count--;
            } else {
                memmove((void*)(node->keys + index), (void*)(node->keys + index + 1), (node->keys_count - index - 1) * sizeof(BTKey));
                node->keys_count--;
            }
        }
};

int main() {
    BTree tree = BTree();
    tree.insert(5, 1);
    tree.insert(6, 1);
    tree.insert(7, 1);
    tree.insert(8, 1);
    tree.insert(9, 1);
    tree.insert(10, 1);

    std::cout << tree.root->children_count << " " << tree.root->keys_count << std::endl;
    std::cout << tree.root->children[0]->keys_count << " " << tree.root->children[1]->keys_count << std::endl;
    std::cout << "Has 9: " << tree.has(9) << std::endl;
}