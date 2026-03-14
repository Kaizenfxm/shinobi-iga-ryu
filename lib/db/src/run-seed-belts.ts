import { seedBelts } from "./seed-belts";
import { pool } from "./index";

seedBelts()
  .then(() => {
    console.log("Done");
    return pool.end();
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
