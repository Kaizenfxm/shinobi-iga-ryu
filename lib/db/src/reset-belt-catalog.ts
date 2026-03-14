import { db, beltDefinitionsTable, beltRequirementsTable, beltExamsTable, studentBeltsTable, beltHistoryTable, studentBeltUnlocksTable } from "./index";
import { pool } from "./index";
import { seedBelts } from "./seed-belts";

async function resetBeltCatalog() {
  console.log("Resetting belt catalog...");

  await db.transaction(async (tx) => {
    console.log("  Clearing student belt unlocks...");
    await tx.delete(studentBeltUnlocksTable);

    console.log("  Clearing belt history...");
    await tx.delete(beltHistoryTable);

    console.log("  Clearing student belts...");
    await tx.delete(studentBeltsTable);

    console.log("  Clearing belt exams...");
    await tx.delete(beltExamsTable);

    console.log("  Clearing belt requirements...");
    await tx.delete(beltRequirementsTable);

    console.log("  Clearing belt definitions...");
    await tx.delete(beltDefinitionsTable);
  });

  console.log("Catalog cleared. Re-seeding...");
  await seedBelts();
  console.log("Reset complete.");
}

resetBeltCatalog()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  });
