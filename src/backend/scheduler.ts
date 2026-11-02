/**
 * Background Scheduler & Worker Service
 * Automatically executes scheduled publishing and background RSS news polling.
 */

import { store } from './store.ts';
import { executeNewsIngest } from './rssFetcher.ts';

export interface SchedulerStatus {
  isRunning: boolean;
  lastPublishCheck: string;
  lastNewsPoll: string;
  publishedCountTotal: number;
  activeTimers: number;
}

class BackgroundScheduler {
  private publishIntervalTimer: NodeJS.Timeout | null = null;
  private newsIntervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPublishCheck = new Date().toISOString();
  private lastNewsPoll = new Date().toISOString();
  private publishedCountTotal = 0;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run scheduled publishing check every 30 seconds
    this.publishIntervalTimer = setInterval(() => {
      this.checkAndPublishScheduledArticles();
    }, 30000);

    // Initial check on startup
    this.checkAndPublishScheduledArticles();
  }

  public stop() {
    if (this.publishIntervalTimer) clearInterval(this.publishIntervalTimer);
    if (this.newsIntervalTimer) clearInterval(this.newsIntervalTimer);
    this.isRunning = false;
  }

  public checkAndPublishScheduledArticles(): { publishedIds: string[] } {
    this.lastPublishCheck = new Date().toISOString();
    const now = new Date();
    const publishedIds: string[] = [];

    store.articles.forEach((article) => {
      if (article.status === 'scheduled' && article.scheduledFor) {
        const scheduledTime = new Date(article.scheduledFor);
        if (scheduledTime <= now) {
          article.status = 'published';
          article.publishedAt = now.toISOString();
          article.updatedAt = now.toISOString();
          store.articles.set(article.id, article);
          publishedIds.push(article.id);
          this.publishedCountTotal++;
        }
      }
    });

    return { publishedIds };
  }

  public async runManualNewsIngestion(): Promise<any[]> {
    this.lastNewsPoll = new Date().toISOString();
    const results = [];
    for (const source of store.newsSources.values()) {
      if (source.isActive) {
        try {
          const res = await executeNewsIngest(source.id);
          results.push(res);
        } catch (err: any) {
          results.push({ source: source.name, error: err.message });
        }
      }
    }
    return results;
  }

  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastPublishCheck: this.lastPublishCheck,
      lastNewsPoll: this.lastNewsPoll,
      publishedCountTotal: this.publishedCountTotal,
      activeTimers: (this.publishIntervalTimer ? 1 : 0) + (this.newsIntervalTimer ? 1 : 0),
    };
  }
}

export const scheduler = new BackgroundScheduler();
