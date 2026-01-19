
const { findBestTableAssignment } = require('./src/services/tableAssignment/engine');

const MOCK_TABLES = [
    { id: "7", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 93 },
    { id: "8", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 92 },
    { id: "9", type: "MERGED_FIXED", minCapacity: 6, maxCapacity: 8, priorityScore: 91 },
    { id: "10", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 90 },
    { id: "11", type: "MERGED_FIXED", minCapacity: 8, maxCapacity: 10, priorityScore: 89 },
    { id: "12", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 88 },
];

const MOCK_ADJACENCY = {
    "7": ["8"],
    "8": ["7", "9"],
    "9": ["8", "10"],
    "10": ["9", "11"],
    "11": ["10", "12"],
    "12": ["11"],
};

console.log("--- TEST 1: Preferred Top Chain (10, 11, 12) ---");
const res1 = findBestTableAssignment(22, ["7", "8", "9", "10", "11", "12"], { tables: MOCK_TABLES, adjacency: MOCK_ADJACENCY });
console.log("Winner for 22:", res1.best ? res1.best.tableIds.join(",") : "NONE");

console.log("\n--- TEST 2: Fallback (7, 8, 9, 10) when 11 or 12 taken ---");
const res2 = findBestTableAssignment(22, ["7", "8", "9", "10"], { tables: MOCK_TABLES, adjacency: MOCK_ADJACENCY });
console.log("Winner for 22 (11/12 taken):", res2.best ? res2.best.tableIds.join(",") : "NONE");
