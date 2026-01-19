import app from "./app";
import { env } from "./config/env";
import { scheduleCleanupJob, startCleanupWorker } from "./jobs/cleanupPendingDeposits";

import { startScheduler } from "./services/scheduler";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  if (env.nodeEnv !== "test") {
    // scheduleCleanupJob().catch(() => {
    //   // ignore scheduling errors on boot; worker will retry on next tick
    // });
    // startCleanupWorker();
    startScheduler();
    console.log(`Reservation API listening on port ${port}`);
  }
});
