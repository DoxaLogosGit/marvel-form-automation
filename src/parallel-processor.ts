// Parallel processing orchestrator for form submissions

import * as fs from 'fs';
import type { PlayData } from './types.js';
import { SCENARIOS_WITHOUT_MODULAR_PAGE } from './constants.js';
import { chunkArray } from './utils.js';
import { FormSubmitter } from './form-submitter.js';

/**
 * Filter and prepare plays for processing
 */
export function filterPlays(allPlays: PlayData[], startDate?: string) {
  let filteredPlays = allPlays;
  let skippedEmptyModular = 0;
  let skippedBeforeDate = 0;
  let skippedBasicAspect = 0;

  // Filter out plays with "Basic" aspect (no aspect - form requires an aspect selection)
  const playsWithAspect = filteredPlays.filter(play => {
    if (play.Heroes && play.Heroes.some((h: { Aspect: string }) => h.Aspect === 'Basic')) {
      skippedBasicAspect++;
      return false;
    }
    return true;
  });
  filteredPlays = playsWithAspect;

  // Filter out plays with empty modular sets (unless it's a scenario that doesn't use modulars)
  const playsWithModular = filteredPlays.filter(play => {
    // Scenarios like Wrecking Crew don't use modular sets, so don't filter them out
    if (SCENARIOS_WITHOUT_MODULAR_PAGE.has(play.Villain)) {
      return true;
    }
    if (!play.Modular_Sets || play.Modular_Sets.length === 0) {
      skippedEmptyModular++;
      return false;
    }
    return true;
  });
  filteredPlays = playsWithModular;

  // Filter by start date if provided
  if (startDate) {
    const startDateObj = new Date(startDate);
    const playsAfterDate = filteredPlays.filter(play => {
      const playDate = new Date(play.Date);
      if (playDate < startDateObj) {
        skippedBeforeDate++;
        return false;
      }
      return true;
    });
    filteredPlays = playsAfterDate;
  }

  // Sort plays by date (oldest first) so we process chronologically
  const playsToProcess = filteredPlays.sort((a, b) => {
    return new Date(a.Date).getTime() - new Date(b.Date).getTime();
  });

  return {
    playsToProcess,
    stats: {
      total: allPlays.length,
      skippedBasicAspect,
      skippedEmptyModular,
      skippedBeforeDate
    }
  };
}

/**
 * Process plays in parallel using multiple browser instances
 */
export async function processPlaysInParallel(jsonPath: string, startDate?: string, maxWorkers: number = 8, dryRun: boolean = false) {
  // Read the JSON file
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allPlays: PlayData[] = JSON.parse(jsonData);

  console.log(`Loaded ${allPlays.length} plays from ${jsonPath}`);

  // Filter plays
  const { playsToProcess, stats } = filterPlays(allPlays, startDate);

  // Print filtering summary
  console.log(`\n=== Filtering Summary ===`);
  console.log(`Total plays in file: ${stats.total}`);
  if (stats.skippedBasicAspect > 0) {
    console.log(`Skipped (Basic/no aspect): ${stats.skippedBasicAspect}`);
  }
  if (stats.skippedEmptyModular > 0) {
    console.log(`Skipped (empty modular sets): ${stats.skippedEmptyModular}`);
  }
  if (startDate) {
    console.log(`Start date filter: ${startDate}`);
    console.log(`Skipped (before start date): ${stats.skippedBeforeDate}`);
  }
  console.log(`Plays to process: ${playsToProcess.length}`);

  // Determine optimal number of workers
  const numWorkers = Math.min(maxWorkers, playsToProcess.length);
  console.log(`Using ${numWorkers} parallel workers`);
  if (dryRun) {
    console.log(`⚠️  DRY RUN MODE: Forms will be filled but NOT submitted\n`);
  } else {
    console.log();
  }

  if (numWorkers === 0) {
    console.log('No plays to process.');
    return;
  }

  // Split plays into chunks for parallel processing
  const chunks = chunkArray(playsToProcess, numWorkers);

  // Create workers and initialize them
  const workers: FormSubmitter[] = [];
  console.log('Initializing workers...');
  for (let i = 0; i < numWorkers; i++) {
    const worker = new FormSubmitter(i + 1, dryRun);
    await worker.initialize();
    workers.push(worker);
    console.log(`  Worker ${i + 1} initialized`);
  }

  console.log('\nStarting parallel processing...\n');

  // Process all chunks in parallel
  const startTime = Date.now();
  const results = await Promise.all(
    chunks.map((chunk, index) =>
      workers[index].processPlaysChunk(chunk, index, numWorkers)
    )
  );

  // Close all workers
  console.log('\nClosing workers...');
  await Promise.all(workers.map(worker => worker.close()));

  // Aggregate results
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print final summary
  console.log(`\n=== Final Summary ===`);
  console.log(`Total plays processed: ${playsToProcess.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Time elapsed: ${elapsedTime} seconds`);
  console.log(`Average time per play: ${(parseFloat(elapsedTime) / playsToProcess.length).toFixed(2)} seconds`);
}

/**
 * Process plays sequentially using a single browser instance
 */
export async function processPlaysSequentially(jsonPath: string, startDate?: string, dryRun: boolean = false) {
  // Read the JSON file
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allPlays: PlayData[] = JSON.parse(jsonData);

  console.log(`Loaded ${allPlays.length} plays from ${jsonPath}`);

  // Filter plays
  const { playsToProcess, stats } = filterPlays(allPlays, startDate);

  // Print filtering summary
  console.log(`\n=== Filtering Summary ===`);
  console.log(`Total plays in file: ${stats.total}`);
  if (stats.skippedBasicAspect > 0) {
    console.log(`Skipped (Basic/no aspect): ${stats.skippedBasicAspect}`);
  }
  if (stats.skippedEmptyModular > 0) {
    console.log(`Skipped (empty modular sets): ${stats.skippedEmptyModular}`);
  }
  if (startDate) {
    console.log(`Start date filter: ${startDate}`);
    console.log(`Skipped (before start date): ${stats.skippedBeforeDate}`);
  }
  console.log(`Plays to process: ${playsToProcess.length}`);
  if (dryRun) {
    console.log(`⚠️  DRY RUN MODE: Forms will be filled but NOT submitted\n`);
  } else {
    console.log();
  }

  const submitter = new FormSubmitter(1, dryRun);

  let successCount = 0;
  let failureCount = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  try {
    await submitter.initialize();

    for (const play of playsToProcess) {
      // Check if we've had too many consecutive failures (likely browser/connection issue)
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`\n⚠️  Too many consecutive failures (${consecutiveFailures}). Stopping.`);
        break;
      }

      const success = await submitter.submitPlay(play);
      if (success) {
        successCount++;
        consecutiveFailures = 0;
        // Wait a bit between submissions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        failureCount++;
        consecutiveFailures++;
        // Wait longer after a failure
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } finally {
    await submitter.close();
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total plays processed: ${playsToProcess.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
}
