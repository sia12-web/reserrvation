import { ADJACENCY_GRAPH, TABLES } from "./layout";
import { AssignmentOptions, CandidateSet, TableConfig, TableType } from "./types";

const DEFAULT_OPTIONS: AssignmentOptions = {
  maxTablesInCombination: 8,
  tables: TABLES,
  adjacency: ADJACENCY_GRAPH,
};

export interface AssignmentResult {
  candidates: CandidateSet[];
  best?: CandidateSet;
}

export function findBestTableAssignment(
  partySize: number,
  availableTableIds: string[],
  options: Partial<AssignmentOptions> = {}
): AssignmentResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const tables = mergedOptions.tables ?? TABLES;
  const adjacency = mergedOptions.adjacency ?? ADJACENCY_GRAPH;
  const tableMap = new Map(tables.map((table) => [table.id, table]));
  const eligibleTables = buildEligibleTables(partySize, availableTableIds, tableMap);

  const candidates = [
    ...generateSingleTableCandidates(partySize, eligibleTables),
    ...generateCombinationCandidates(partySize, eligibleTables, mergedOptions, tableMap, adjacency),
  ];

  const sorted = candidates.sort(
    (a, b) => a.score - b.score || a.tableIds[0].localeCompare(b.tableIds[0])
  );
  return { candidates: sorted, best: sorted[0] };
}

function buildEligibleTables(
  partySize: number,
  availableTableIds: string[],
  tableMap: Map<string, TableConfig>
): TableConfig[] {
  const availableSet = new Set(availableTableIds);

  return Array.from(tableMap.values()).filter((table) => {
    if (!availableSet.has(table.id)) return false;
    if (table.minCapacity > partySize) return false;
    if (table.type === "CIRCULAR" && partySize > 7) return false;
    return true;
  });
}

function generateSingleTableCandidates(
  partySize: number,
  eligibleTables: TableConfig[]
): CandidateSet[] {
  return eligibleTables
    .filter((table) => table.maxCapacity >= partySize)
    .map((table) => buildCandidate([table], partySize));
}

function generateCombinationCandidates(
  partySize: number,
  eligibleTables: TableConfig[],
  options: AssignmentOptions,
  tableMap: Map<string, TableConfig>,
  adjacency: Record<string, string[]>
): CandidateSet[] {
  const eligibleSet = new Set(eligibleTables.map((table) => table.id));
  const candidates: CandidateSet[] = [];
  const seen = new Set<string>();

  for (const table of eligibleTables) {
    const stack: string[][] = [[table.id]];

    while (stack.length > 0) {
      const path = stack.pop();
      if (!path) continue;

      if (path.length > 1) {
        const tables = path.map((id) => tableMap.get(id)).filter(Boolean) as TableConfig[];
        const total = getGeometricCapacity(tables);

        if (total >= partySize) {
          const candidate = buildCandidate(tables, partySize);
          const key = candidate.tableIds.join(",");
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push(candidate);
          }
        }
      }

      if (path.length >= options.maxTablesInCombination) continue;

      const last = path[path.length - 1];
      const neighbors = adjacency[last] ?? [];

      for (const neighbor of neighbors) {
        if (!eligibleSet.has(neighbor)) continue;
        if (path.includes(neighbor)) continue;

        const tablesInPath = path.map((id) => tableMap.get(id)).filter(Boolean) as TableConfig[];
        if (wouldCombineCircular(tablesInPath, neighbor, tableMap)) continue;

        stack.push([...path, neighbor]);
      }
    }
  }

  return candidates;
}

function buildCandidate(tables: TableConfig[], partySize: number): CandidateSet {
  const sortedIds = [...tables]
    .map((table) => table.id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const totalCapacity = getGeometricCapacity(tables);
  const score = scoreCandidate(tables, partySize);

  return {
    tableIds: sortedIds,
    maxCapacity: totalCapacity,
    score,
  };
}

function scoreCandidate(tables: TableConfig[], partySize: number): number {
  const totalCapacity = getGeometricCapacity(tables);
  const waste = totalCapacity - partySize;

  // Heavily penalize multiple tables to favor single-table solutions (was 2, now 20)
  const tableCountPenalty = (tables.length - 1) * 10; // Reduced from 20 to 10 to allow reasonable combinations

  const mismatchPenalty = tables.reduce((sum, table) => {
    // Penalize using a large Merged Fixed table for very small groups if not needed
    if (table.type === "MERGED_FIXED" && partySize <= 5) return sum + 10;
    return sum;
  }, 0);

  // const fragmentPenalty = calculateTopChainFragmentPenalty(tables);
  const circularPenalty = tables.some((table) => table.type === "CIRCULAR") && tables.length > 1 ? 100 : 0;

  // Bonus for using Circular tables for their ideal range (4-7)
  let circularBonus = 0;
  if (tables.length === 1 && tables[0].type === "CIRCULAR" && partySize >= 5 && partySize <= 7) {
    circularBonus = -50;
  }

  // Generalized Bonus for using "Premium" or "High Priority" tables for larger groups
  // This rewards the restaurant's preferred seating arrangement
  const bigTableBonus = tables.reduce((sum, t) => {
    if (t.priorityScore > 50 && partySize >= 8) return sum - 5;
    return sum;
  }, 0);

  const fragmentPenalty = calculateTopChainFragmentPenalty(tables);
  // Use average priority instead of sum to avoid favoring combinations
  const avgPriority = tables.reduce((sum, table) => sum + table.priorityScore, 0) / tables.length;

  // Stronger priority adjustment to favor standard/high-pri tables over overflow (pri 0)
  const priorityAdjustment = -avgPriority * 10;

  // Explicit semi-ban on Priority 0 (Overflow) tables unless necessary
  // If avgPriority is low (e.g. 0), we add a massive penalty
  const lowPriorityPenalty = avgPriority < 0.5 ? 50 : 0;

  return (
    waste +
    tableCountPenalty +
    mismatchPenalty +
    fragmentPenalty +
    circularPenalty +
    circularBonus +
    bigTableBonus +
    priorityAdjustment +
    lowPriorityPenalty
  );
}

function wouldCombineCircular(
  tablesInPath: TableConfig[],
  candidateId: string,
  tableMap: Map<string, TableConfig>
): boolean {
  const candidate = tableMap.get(candidateId);
  if (!candidate) return true;

  const hasCircular = tablesInPath.some((table) => table.type === "CIRCULAR");
  if (candidate.type === "CIRCULAR" && tablesInPath.length > 0) return true;
  if (hasCircular && tablesInPath.length > 0) return true;
  return false;
}

export function getTableType(tableId: string): TableType | undefined {
  const table = (DEFAULT_OPTIONS.tables ?? TABLES).find((t) => t.id === tableId);
  return table?.type;
}

function calculateTopChainFragmentPenalty(
  tables: TableConfig[],
  adjacency?: Record<string, string[]>
): number {
  if (!adjacency || tables.length === 1) return 0;

  const tableSet = new Set(tables.map((table) => table.id));
  let penalty = 0;

  // Penalize a combination if it includes tables that are NOT adjacent in the graph
  // though the generator already handles adjacency.
  // Instead, let's penalize "orphaning" a table's neighbor that has a very high priority.
  // Actually, the simplest way is to penalize fragmented selections.

  return penalty;
}

function getTableUnits(table: TableConfig): number {
  // Merged Fixed tables count as 2 units (e.g. T9, T11, T12)
  if (table.type === "MERGED_FIXED") return 2;
  return 1;
}

export function getGeometricCapacity(tables: TableConfig[]): number {
  if (tables.length === 0) return 0;
  if (tables.length === 1) return tables[0].maxCapacity;

  // Horizontal/Vertical Layout agnostic geometric capacity
  // Based on user feedback: 3 tables (T1+T2+T3) should accommodate ~15 people.
  // Our formula below: 10 (base 2 units) + 5 (3rd unit) = 15.
  // This matches perfectly. We remove the explicit "Sum if Vertical" check because
  // simple summing (4+4+4=12) undercounts the capacity of T1+T2+T3 (15).

  const totalUnits = tables.reduce((sum, t) => sum + getTableUnits(t), 0);

  if (totalUnits <= 1) return tables[0].maxCapacity;

  // Formula: 2->10, 3->15, 4->19, 5->24, 6->28...
  // Base 2 units = 10.
  let capacity = 10;
  for (let u = 3; u <= totalUnits; u++) {
    // If u is Odd (3, 5) -> +5
    // If u is Even (4, 6) -> +4
    if (u % 2 !== 0) capacity += 5;
    else capacity += 4;
  }
  return capacity;
}
