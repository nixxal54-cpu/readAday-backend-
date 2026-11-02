/**
 * Standalone CLI Script for Render Cron Job: Automated News Ingestion
 * Can be scheduled via Render Cron Jobs (e.g. every 30 or 60 minutes):
 * Command: npm run cron:news
 */

import { scheduler } from '../scheduler.ts';

async function main() {
  console.log('[readAday Cron] Triggering news ingestion across active RSS & wire sources...');
  const results = await scheduler.runManualNewsIngestion();
  console.log('[readAday Cron] News ingestion run completed.');
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('[readAday Cron Error] News ingestion failed:', err);
  process.exit(1);
});
