/**
 * Standalone CLI Script for Render Cron Job: Scheduled Publishing
 * Can be scheduled via Render Cron Jobs (e.g. every 5 or 10 minutes):
 * Command: npm run cron:publish
 */

import { scheduler } from '../scheduler.ts';

async function main() {
  console.log('[readAday Cron] Checking for scheduled articles ready to publish...');
  const result = scheduler.checkAndPublishScheduledArticles();
  console.log(`[readAday Cron] Successfully published ${result.publishedIds.length} article(s).`);
  if (result.publishedIds.length > 0) {
    console.log('[readAday Cron] Published IDs:', result.publishedIds);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[readAday Cron Error] Scheduled publishing failed:', err);
  process.exit(1);
});
