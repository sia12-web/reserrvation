
const { findBestTableAssignment } = require('./src/services/tableAssignment/engine');

const MOCK_TABLES = [
    { id: "9", type: "MERGED_FIXED", minCapacity: 6, maxCapacity: 8, priorityScore: 91 },
    { id: "10", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 90 },
    { id: "11", type: "MERGED_FIXED", minCapacity: 8, maxCapacity: 10, priorityScore: 89 },
    { id: "12", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 88 },
    { id: "13", type: "MERGED_FIXED", minCapacity: 6, maxCapacity: 8, priorityScore: 87 },
];

const MOCK_ADJACENCY = {
    "9": ["10"],
    "10": ["9", "11"],
    "11": ["10", "12"],
    "12": ["11", "13"],
    "13": ["12"],
};

const result = findBestTableAssignment(12, ["9", "10", "11", "12", "13"], {
    tables: MOCK_TABLES,
    adjacency: MOCK_ADJACENCY
});

console.log("Top 5 for Party of 12:");
result.candidates.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. Tables: ${c.tableIds.join(", ")} | Score: ${c.score.toFixed(2)}`);
});
