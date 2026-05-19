import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MealSeed = {
  key: string; name: string; emoji: string; description: string;
  basePriceMinor: number; kcal?: number; dietary?: string;
  availableDows: number[]; extraLabel?: string; sortOrder: number;
};

const DEFAULT_MEALS: MealSeed[] = [
  { key: "veg", name: "Veg", emoji: "🥗", description: "Dal · rice · sabzi", basePriceMinor: 5000, kcal: 540, dietary: "VEGAN",  availableDows: [1,2,3,4,5], sortOrder: 0 },
  { key: "chicken", name: "Chicken", emoji: "🍗", description: "Curry · rice · salad", basePriceMinor: 9000, kcal: 720, dietary: "+ Rs 40", availableDows: [3], extraLabel: "Wed only", sortOrder: 1 },
  { key: "egg", name: "Egg Curry", emoji: "🥚", description: "Curry · rice · sabzi", basePriceMinor: 6500, kcal: 610, dietary: "+ Rs 15", availableDows: [1], extraLabel: "Mon only", sortOrder: 2 },
  { key: "none", name: "Skip", emoji: "🚫", description: "No lunch today", basePriceMinor: 0, dietary: "FREE", availableDows: [1,2,3,4,5], sortOrder: 99 },
];

const DEFAULT_ADDONS = [
  { key: "egg_extra", name: "Extra egg", unitPriceMinor: 2500, maxQty: 3 },
];

async function main() {
  const workspaces = await prisma.workspace.findMany();
  console.log(`Found ${workspaces.length} workspaces`);

  for (const ws of workspaces) {
    // Cutoff
    await prisma.lunchCutoff.upsert({
      where: { workspaceId: ws.id },
      create: { workspaceId: ws.id, cutoffHour: 10, cutoffMinute: 30, gracePeriodMinutes: 0, timezone: "Asia/Kathmandu" },
      update: {},
    });

    for (const m of DEFAULT_MEALS) {
      await prisma.meal.upsert({
        where: { workspaceId_key: { workspaceId: ws.id, key: m.key } },
        create: { workspaceId: ws.id, ...m },
        update: {},
      });
    }

    for (const a of DEFAULT_ADDONS) {
      await prisma.mealAddon.upsert({
        where: { workspaceId_key: { workspaceId: ws.id, key: a.key } },
        create: { workspaceId: ws.id, ...a },
        update: {},
      });
    }

    console.log(`  Seeded ws ${ws.slug}`);
  }

  console.log("Lunch seed complete");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
