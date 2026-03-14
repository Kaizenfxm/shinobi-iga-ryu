import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import profesorRouter from "./profesor";
import beltsRouter from "./belts";
import fightsRouter from "./fights";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(profesorRouter);
router.use(beltsRouter);
router.use(fightsRouter);
router.use(profileRouter);

export default router;
