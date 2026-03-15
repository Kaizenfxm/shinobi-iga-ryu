import { Router } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const settingsRouter = Router();

settingsRouter.get("/settings/public", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, ["whatsapp_admin_number", "payment_link_url"]));

    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }

    res.json({
      whatsappAdminNumber: result["whatsapp_admin_number"] || "",
      paymentLinkUrl: result["payment_link_url"] || "",
    });
  } catch (error) {
    console.error("Get public settings error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default settingsRouter;
