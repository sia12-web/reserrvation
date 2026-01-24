import app from "./app";
import { env } from "./config/env";
import { scheduleCleanupJob, startCleanupWorker } from "./jobs/cleanupPendingDeposits";
import { startScheduler } from "./services/scheduler";
import { initDb } from "./config/initDb";

const port = Number(process.env.PORT ?? 3000);

// Initialize database (ensure tables exist) then start server
initDb()
  .then(() => {
    app.listen(port, () => {
      if (env.nodeEnv !== "test") {
        startScheduler();
        console.log(`Reservation API listening on port ${port}`);
      }
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
