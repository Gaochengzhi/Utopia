import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  // Persist ISR/SSG output in R2 (utopia-cache bucket) so pages render once
  // and are then served from cache. Without this every page view re-runs
  // getStaticProps + full React SSR in the worker, which is what pushed the
  // worker over its resource limits under load.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // In-isolate revalidation queue; per-isolate dedup is enough for this
  // blog's traffic. Content freshness is driven by `revalidate` on each page.
  queue: memoryQueue,
});
