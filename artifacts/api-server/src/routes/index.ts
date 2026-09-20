import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import interviewsRouter from "./interviews";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(interviewsRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
