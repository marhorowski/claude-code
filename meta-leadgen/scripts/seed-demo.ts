import { createDemoClient } from "../src/lib/demo";
import { prisma } from "../src/lib/db";

createDemoClient()
  .then((c) => console.log(`Dodano klienta demo: ${c.name} (${c.id})`))
  .finally(() => prisma.$disconnect());
