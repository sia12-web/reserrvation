import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // Check if data already exists to avoid wiping production data on restart
    const existingLayout = await prisma.layout.findFirst();
    if (existingLayout) {
        console.log("Database already seeded. Skipping seed.");
        return;
    }

    // Only clean up if we are absolutely sure (or just proceed to create)
    // For safety, let's just create. If you want to force reset, do it manually.


    const layout = await prisma.layout.create({
        data: {
            name: "Main Dining Room",
            isActive: true,
            adjacencyGraph: {
                T1: ["T2"],
                T2: ["T1", "T3"],
                T3: ["T2"],
                T4: ["T5"],
                T5: ["T4", "T6"],
                T6: ["T5"],
                T7: ["T8"],
                T8: ["T7"],
                T9: ["T10"],
                T10: ["T9", "T11"],
                T11: ["T10", "T12"],
                T12: ["T11", "T13"],
                T13: ["T12", "T14"],
                T14: ["T13"]
            },
            effectiveDate: new Date(),
        }
    })

    // Coordinates based on User's 1000x600 layout image
    // Top Row: 9, 10, 11, 12, 13
    // Mid Row: 8, 7 (Left), 6, 5, 4 (Center), 14 (Right)
    // Bot Row: 1, 2, 3

    const tables = [
        // --- Bottom Row ---
        { id: "T1", x: 280, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T2", x: 440, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T3", x: 600, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        // T15: Infinite/Overflow Table
        { id: "T15", x: 830, y: 450, width: 120, height: 70, shape: "RECTANGLE", min: 1, max: 20, type: "STANDARD", pri: 0 },

        // --- Middle Row (Left) ---
        { id: "T7", x: 50, y: 400, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T8", x: 50, y: 300, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },

        // --- Middle Row (Center) ---
        { id: "T6", x: 350, y: 330, width: 90, height: 90, shape: "CIRCLE", min: 4, max: 7, type: "CIRCULAR", pri: 2 },
        { id: "T5", x: 500, y: 320, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T4", x: 650, y: 330, width: 90, height: 90, shape: "CIRCLE", min: 4, max: 7, type: "CIRCULAR", pri: 2 },

        // --- Middle Row (Right) ---
        { id: "T14", x: 830, y: 320, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },

        // --- Top Row ---
        // T9: Vertical Stack (Merged) - Representing 2 boxes
        { id: "T9", x: 50, y: 50, width: 120, height: 150, shape: "RECTANGLE", min: 6, max: 12, type: "MERGED_FIXED", pri: 3 },

        // T10: Vertical
        { id: "T10", x: 220, y: 80, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },

        // T11: Horizontal Side-by-Side (Merged) - Representing 2 boxes
        { id: "T11", x: 350, y: 80, width: 220, height: 70, shape: "RECTANGLE", min: 8, max: 12, type: "MERGED_FIXED", pri: 3 },

        // T12: Vertical
        { id: "T12", x: 650, y: 80, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },

        // T13: Vertical Stack (Merged) - Representing 2 boxes
        { id: "T13", x: 800, y: 50, width: 120, height: 150, shape: "RECTANGLE", min: 6, max: 12, type: "MERGED_FIXED", pri: 3 },
    ]

    for (const t of tables) {
        await prisma.table.create({
            data: {
                id: t.id,
                type: t.type as "STANDARD" | "CIRCULAR" | "MERGED_FIXED",
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                shape: t.shape,
                minCapacity: t.min,
                maxCapacity: t.max,
                priorityScore: t.pri,
                layoutId: layout.id,
            }
        })
    }

    console.log("Seeded layout and tables based on user request")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
