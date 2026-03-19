import { Router } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const settingsRouter = Router();

settingsRouter.get("/settings/public", async (_req, res) => {
  try {
    const publicKeys = ["whatsapp_admin_number", "payment_link_url", "bogota_video_url", "chia_video_url", "bogota_address", "chia_address", "privacy_policy_url"];
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, publicKeys));

    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }

    res.json({
      whatsappAdminNumber: result["whatsapp_admin_number"] || "",
      paymentLinkUrl: result["payment_link_url"] || "",
      bogotaVideoUrl: result["bogota_video_url"] || "",
      chiaVideoUrl: result["chia_video_url"] || "",
      bogotaAddress: result["bogota_address"] || "",
      chiaAddress: result["chia_address"] || "",
      privacyPolicyUrl: result["privacy_policy_url"] || "",
    });
  } catch (error) {
    console.error("Get public settings error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default settingsRouter;
