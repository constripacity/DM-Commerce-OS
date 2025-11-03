import { PrismaClient } from "@prisma/client";
import { runDemoSeed } from "../src/lib/demo-reset";

const prisma = new PrismaClient();

async function main() {
  await runDemoSeed(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
