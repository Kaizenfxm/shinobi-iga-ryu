import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import profesorRouter from "./profesor";
import beltsRouter from "./belts";
import fightsRouter from "./fights";
import profileRouter from "./profile";
import storageRouter from "./storage";
import notificationsRouter from "./notifications";
import trainingRouter from "./training";
import settingsRouter from "./settings";
import classesRouter from "./classes";
import eventsRouter from "./events";
import challengesRouter from "./challenges";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(profesorRouter);
router.use(beltsRouter);
router.use(fightsRouter);
router.use(profileRouter);
router.use(storageRouter);
router.use(notificationsRouter);
router.use(trainingRouter);
router.use(settingsRouter);
router.use(classesRouter);
router.use(eventsRouter);
router.use(challengesRouter);

export default router;
