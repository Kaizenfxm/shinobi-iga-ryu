import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import profesorRouter from "./profesor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(profesorRouter);

export default router;
