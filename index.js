class BTNode {
    constructor() {
        this.keys = [];
        this.children = [];
    }

    get is_leaf() {
        return this.children.length === 0;
    }
};

function binary_search(array, value) {
    let start = 0;
    let end = array.length - 1;
    let mid = Math.floor((start + end) / 2);

    while (start <= end) {
        if (array[mid] === value) {
            return mid;
        } else if (array[mid] < value) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
        
        mid = Math.floor((start + end) / 2);
    }

    return start;
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class BTree {
    constructor(order) {
        this.root = new BTNode();
        this.tree_depth = 1;
        this.tree_width = 2;
        this.node_count = 1;

        this.node_capacity = order - 1;
        this.node_minimum_keys = Math.ceil(order / 2) - 1;
    }

    traverse_node(value, node) {
        // If node has no children.
        if (node.is_leaf) return null;

        // Start child node.
        if (value < node.keys[0]) {
            return { index: 0, node: node.children[0] };
        }
        
        // Final child node.
        else if (value > node.keys[node.keys.length - 1]) {
            return { index: node.children.length - 1, node: node.children[node.children.length - 1] };
        }

        // Number must be in between.
        else {
            // Find the index of the child to traverse down to.
            const child_index = binary_search(node.keys, value);

            return { index: child_index, node: node.children[child_index] };
        }
    }

    merge_nodes(node, node2, node2_child_index) {
        // Set the parent pointer of node2's children to node.
        for (let i = 0; i < node2.children.length; i++) {
            node2.children[i].parent = node;
        }

        node.keys = [...node.keys, ...node2.keys];
        node.children = [...node.children, ...node2.children];
        node.parent.children.splice(node2_child_index, 1);
    }

    split_node(node, child_index) {
        // Calculate the index of the middle-most element.
        let middle_index = Math.floor(node.keys.length / 2);

        // If node is the root node.
        if (!node.parent) {
            this.tree_depth++;

            // Create first node and copy the < values.
            let child1 = new BTNode();
            child1.parent = node;
            for (let i = 0; i != middle_index; i++) child1.keys.push(node.keys[i]);

            // Create the second node and copy the > values.
            let child2 = new BTNode();
            child2.parent = node;
            for (let i = middle_index + 1; i < node.keys.length; i++) child2.keys.push(node.keys[i]);

            this.node_count += 2;

            // Set the middle value as root.
            node.keys = [node.keys[middle_index]];

            // If node has children.
            if (node.children.length) {
                let childrenShare = Math.floor(node.children.length / 2);

                // Split the nodes children and share between both children.
                for (let i = 0; i < childrenShare; i++) {
                    let child = node.children[i];
                    child.parent = child1;
                    child1.children.push(child);
                }

                // Copy the remaining children to node 2.
                for (let i = childrenShare; i != node.children.length; i++) {
                    let child = node.children[i];
                    child.parent = child2;
                    child2.children.push(child);
                }
            }

            // Replace the nodes children.
            node.children = [child1, child2];

            // Return node.
            return node;

        // Regular node.
        } else {
            // Find the insert position and insert.
            node.parent.keys.splice(binary_search(node.parent.keys, node.keys[middle_index]), 0, node.keys[middle_index]);

            // Create a new right child and copy the < values.
            let child = new BTNode();
            child.parent = node.parent;
            for (let i = middle_index + 1; i < node.keys.length; i++) child.keys.push(node.keys[i]);

            this.tree_width += 1;
            this.node_count += 1;

            // If node has children.
            if (node.children.length) {
                let childrenShare = Math.floor(node.children.length / 2);

                // Copy the right-most children to the new node.
                for (let i = childrenShare; i != node.children.length; i++) {
                    let childN = node.children[i];
                    childN.parent = child;
                    child.children.push(childN);
                }

                // Remove the copied children.
                node.children.splice(-(child.children.length));
            }

            // Add the child to the right of the node.
            node.parent.children.splice(child_index + 1, 0, child);

            // Remove the copied keys.
            node.keys.splice(-(child.keys.length + 1));

            // Return the parent node.
            return node.parent;
        }
    }

    remove_key_minimum_handle(node, key_index, child_index) {
        //console.log(node, key_index, child_index);

        // If node has less than minimum number of keys.
        if (node.keys.length < (node === this.root ? 1 : this.node_minimum_keys)) {
            // Check left sibling for borrow opportunity.
            if (node.parent.children[child_index - 1] && node.parent.children[child_index - 1].keys.length > this.node_minimum_keys) {
                const seperator_key_index = this.get_separator_key_index(child_index, false);

                // Shift the array and push the separator key in parent to start of keys.
                node.keys.unshift(node.parent.keys[seperator_key_index]);

                // Replace separator key in parent to borrowed key and delete from borrowed node.
                node.parent.keys[seperator_key_index] = node.parent.children[child_index - 1].keys.pop();

                // If node has children.
                if (!node.is_leaf) {
                    // Update the child's parent pointer.
                    node.parent.children[child_index - 1].children[node.parent.children[child_index - 1].children.length - 1].parent = node;

                    // Shift right-most child of borrowed sibling to node.
                    node.children.unshift(node.parent.children[child_index - 1].children.pop());
                }
            }

            // Check right sibling for borrow opportunity.
            else if (node.parent.children[child_index + 1] && node.parent.children[child_index + 1].keys.length > this.node_minimum_keys) {
                const seperator_key_index = this.get_separator_key_index(child_index, true);

                // Push the separator key in parent to end of keys.
                node.keys.push(node.parent.keys[seperator_key_index]);

                // Replace separator key in parent to borrowed key and delete from borrowed node.
                node.parent.keys[seperator_key_index] = node.parent.children[child_index + 1].keys.shift();

                // If node has children.
                if (!node.is_leaf) {
                    // Update the child's parent pointer.
                    node.parent.children[child_index + 1].children[0].parent = node;

                    // Push left-most child of borrowed sibling to node.
                    node.children.push(node.parent.children[child_index + 1].children.shift());
                }
            }

            // Siblings also have minimum keys.
            else {
                let merged_node;
                let seperator_key_index;

                //console.log("Merging...");

                // Check left sibling for merge opportunity.
                if (node.parent.children[child_index - 1]) {
                    seperator_key_index = this.get_separator_key_index(child_index, false);

                    // Get the sibling to be merged with.
                    merged_node = node.parent.children[child_index - 1];

                    
                    // Bring down root index into base merge node.
                    merged_node.keys.push(node.parent.keys[seperator_key_index]);

                    // Remove root key from parent.
                    node.parent.keys.splice(seperator_key_index, 1);

                    // Merge the nodes.
                    this.merge_nodes(merged_node, node, child_index);
                }

                // Check right sibling for merge opportunity.
                else if (node.parent.children[child_index + 1]) {
                    seperator_key_index = this.get_separator_key_index(child_index, true);

                    // Get the sibling to be merged with.
                    merged_node = node;

                    // Bring down root index into base merge node.
                    merged_node.keys.push(node.parent.keys[seperator_key_index]);

                    // Remove root key from parent.
                    node.parent.keys.splice(seperator_key_index, 1);

                    // Merge the nodes.
                    this.merge_nodes(merged_node, node.parent.children[child_index + 1], child_index + 1);
                }

                // If parent node has a parent.
                if (merged_node.parent?.parent) {
                    // If parent has < minimum keys.
                    if (merged_node.parent.keys.length < (node === this.root ? 1 : this.node_minimum_keys)) {
                        // Call the function for parent.
                        // TODO - improve lookup of child index
                        this.remove_key_minimum_handle(merged_node.parent, seperator_key_index, merged_node.parent.parent.children.findIndex(c => c === merged_node.parent));
                    }
                } 

                // Parent of parent node has no parent.
                // Parent is root.
                // If root has ran out of keys.
                else if (merged_node.parent.keys.length === 0) {
                    // Delete the root node and replace with merged node.
                    this.root = merged_node;

                    // Remove the parent pointer for root.
                    delete this.root["parent"];
                }
            }
        }
    }

    remove(value) {
        const node_search = this.find_node(value);
        if (!node_search) return false;

        //console.log(node_search);

        // If node is a leaf.
        if (node_search.node.is_leaf) {
            // Delete key directly.
            node_search.node.keys.splice(node_search.key_index, 1);

            // If node is root and a leaf node.
            if (this.root == node_search.node && node_search.node.is_leaf) return true;

            // Call leaf node minimum function.
            this.remove_key_minimum_handle(node_search.node, node_search.key_index, node_search.index);
        } 
        
        else {
            // Get the index of the child predecessor.
            const successor_child_index = this.get_successor_index(node_search.key_index, false);

            // If the child of the node is a leaf node.
            if (node_search.node.children[0].is_leaf) {
                const left_child = node_search.node.children[this.get_successor_index(node_search.key_index, false)];
                const right_child = node_search.node.children[this.get_successor_index(node_search.key_index, true)];
                
                // If the left child exists and has > minimum keys.
                if (left_child && left_child.keys.length > this.node_minimum_keys) {
                    // Promote the right-most key to seperator index.
                    node_search.node.keys[node_search.key_index] = left_child.keys.pop();
                }

                // If the right child exists and has > minimum keys.
                else if (right_child && right_child.keys.length > this.node_minimum_keys) {
                    // Promote the left-most key to seperator index.
                    node_search.node.keys[node_search.key_index] = right_child.keys.shift();
                }

                // TODO - Save index of successor node.
                // All successor siblings have minimum keys.
                else {
                    // Remove the key.
                    node_search.node.keys.splice(node_search.key_index, 1);

                    // Merge with the right node.
                    this.merge_nodes(left_child, right_child, this.get_successor_index(node_search.key_index, true));

                    // If node is root and amount of keys is 0.
                    if (node_search.node === this.root && node_search.node.keys.length === 0) {
                        // Delete the root node and replace with merged node.
                        this.root = node_search.node.children[0];
                    }

                    // Call leaf node minimum function.
                    else this.remove_key_minimum_handle(node_search.node, node_search.key_index, node_search.index);
                }
            } else {
                // Remove the key.
                //node_search.node.keys.splice(node_search.key_index, 1);

                // Find predecessor/successor left of the key.
                const significant_node = this.find_significant_node(node_search.node.children[successor_child_index], true);

                // Replace the deleted key with the right-most key in the significant node and remove it.
                node_search.node.keys[node_search.key_index] = significant_node.keys.pop();

                // Call leaf node minimum function.
                this.remove_key_minimum_handle(significant_node, significant_node.keys.length, significant_node.parent.children.length - 1);
            }
        }

        return true;
    }

    get_separator_key_index(node_index, direction) {
        if (node_index === 0) return 0;
        else return node_index - !direction;
    }

    get_successor_index(key_index, direction) {
        if (key_index === 0) return direction - 0;
        else return (key_index + 1) - !direction;
    }

    insert(value) {
        let node = this.root;
        let index = 0;

        // If root is at capacity.
        if (node.keys.length >= this.node_capacity) {
            // Split the node early.
            node = this.split_node(node, index);
        }

        while (!node.is_leaf) {
            let traversal = this.traverse_node(value, node);

            node = traversal.node;
            index = traversal.index;

            // If node is at capacity.
            if (node.keys.length >= this.node_capacity) {
                // Split the node early.
                node = this.split_node(node, index);
                continue;
            }
        }

        // Suitable leaf node found.
        
        // Find the index to insert into and insert.
        node.keys.splice(binary_search(node.keys, value), 0, value);
    }

    find_significant_node(start_node, direction) {
        let node = start_node;
        while (!node.is_leaf) {
            node = node.children[direction === false ? 0 : node.children.length - 1];
        }

        return node;
    }

    find_node(value) {
        let traversal_result = { node: this.root, index: 0, key_index: 0 };
        while (true) {
            if (!traversal_result) return null;

            traversal_result["key_index"] = traversal_result.node.keys.findIndex(i => i === value);
            if (traversal_result["key_index"] !== -1) return traversal_result;

            traversal_result = this.traverse_node(value, traversal_result.node);
        }
    }

    has(value) {
        return this.find_node(value) !== null;
    }
};

let tree = new BTree(6);

let arr = [];
for (let i = 0; i < 52; i++) {
    let num = randomInteger(0, 1001);
    while (arr.includes(num)) num = randomInteger(0, 1001);
    arr.push(i);
    tree.insert(i);
}

console.log("Tree depth:", tree.tree_depth);
console.log("Tree width:", tree.tree_width);
console.log("Total nodes:", tree.node_count);

let nodes = [];
let edges = [];

function iterate(node) {
    for (let i = 0; i < node.children.length; i++) {
        nodes.push({ id: node.children[i].keys[0], label: node.children[i].keys.join(", ") });
        edges.push({ from: node.keys[0], to: node.children[i].keys[0] });

        iterate(node.children[i]);
    }
}

function render_tree() {
    nodes = [];
    edges = [];

    nodes.push({ id: tree.root.keys[0], label: tree.root.keys.join(", ") });
    iterate(tree.root);
    
    let container = document.getElementById("mynetwork");
    let data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    let options = {
        layout: {
            hierarchical: {
            direction: "UD",
            sortMethod: "directed",
            treeSpacing: 500,
            nodeSpacing: 500,
            },
        },
        edges: {
            arrows: "to",
        },
    };
    
    network = new vis.Network(container, data, options);     
}

render_tree();

let i = 0;
let index_to_delete = null;
document.addEventListener("keypress", function onPress(event) {
    if (event.key === "x") {
        if (index_to_delete === null) {
            index_to_delete = Math.floor(Math.random() * arr.length);
        } else {
            tree.remove(arr[index_to_delete]);
            arr.splice(index_to_delete, 1);
            index_to_delete = Math.floor(Math.random() * arr.length);
        }

        console.log("Next element:", arr[index_to_delete]);

        render_tree();

        i++;
    }
});

const key1 = document.getElementById("key1");

document.getElementById("insert").addEventListener("click", () => {
    tree.insert(parseInt(key1.value));
    arr.push(parseInt(key1.value));
    key1.value = "";

    render_tree();
});

document.getElementById("delete").addEventListener("click", () => {
    tree.remove(parseInt(key1.value));
    key1.value = "";

    render_tree();
});