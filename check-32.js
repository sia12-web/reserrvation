
const { findBestTableAssignment } = require('./src/services/tableAssignment/engine');

const MOCK_TABLES = [
    { id: "1", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 99, x: 300, y: 500 },
    { id: "2", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 98, x: 450, y: 500 },
    { id: "3", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 97, x: 600, y: 500 },
    { id: "7", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 93, x: 80, y: 350 },
    { id: "8", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 92, x: 80, y: 250 },
    { id: "9", type: "MERGED_FIXED", minCapacity: 6, maxCapacity: 8, priorityScore: 91, x: 80, y: 50 },
    { id: "10", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 90, x: 240, y: 60 },
    { id: "11", type: "MERGED_FIXED", minCapacity: 8, maxCapacity: 10, priorityScore: 89, x: 380, y: 70 },
    { id: "12", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 88, x: 650, y: 60 },
    { id: "13", type: "MERGED_FIXED", minCapacity: 6, maxCapacity: 8, priorityScore: 87, x: 820, y: 50 },
    { id: "14", type: "STANDARD", minCapacity: 1, maxCapacity: 4, priorityScore: 86, x: 820, y: 270 },
];

const MOCK_ADJACENCY = {
    "1": ["2"], "2": ["1", "3"], "3": ["2"],
    "7": ["8"], "8": ["7", "9"], "9": ["8", "10"],
    "10": ["9", "11"], "11": ["10", "12"],
    "12": ["11", "13"], "13": ["12", "14"], "14": ["13"]
};

const partySize = 32;
const result = findBestTableAssignment(partySize, ["1", "2", "3", "7", "8", "9", "10", "11", "12", "13", "14"], {
    tables: MOCK_TABLES,
    adjacency: MOCK_ADJACENCY
});

console.log(`--- Assignment for Party of ${partySize} ---`);
if (result.best) {
    console.log("WINNER:", result.best.tableIds.join(" + "), "| Cap:", result.best.maxCapacity);
} else {
    console.log("NO CANDIDATES FOUND");
}
