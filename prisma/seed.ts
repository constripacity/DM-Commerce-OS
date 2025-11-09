import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runDemoSeed } from "../src/lib/demo-reset";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DM Commerce OS demo data...");
  await runDemoSeed(prisma);
  console.log("✅ Demo data ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
