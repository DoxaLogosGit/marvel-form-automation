// Main entry point for Marvel Champions Form Automation

import { processPlaysInParallel, processPlaysSequentially } from './parallel-processor.js';

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let jsonPath: string | undefined;
  let startDate: string | undefined;
  let maxWorkers = 8;
  let useParallel = true;

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--sequential' || arg === '-s') {
      useParallel = false;
    } else if (arg === '--workers' || arg === '-w') {
      maxWorkers = parseInt(args[++i], 10);
      if (isNaN(maxWorkers) || maxWorkers < 1) {
        console.error('Error: Invalid number of workers');
        process.exit(1);
      }
    } else if (i === 0 && !arg.startsWith('-')) {
      jsonPath = arg;
    } else if (i === 1 && !arg.startsWith('-')) {
      startDate = arg;
    }
  }

  console.log('Marvel Champions Form Automation');
  console.log('=================================\n');
  console.log('Usage: bun start <json-path> [start-date] [options]');
  console.log('  json-path  : Path to JSON file (required)');
  console.log('  start-date : Only process plays on or after this date (YYYY-MM-DD format)');
  console.log('               If not specified, all plays will be processed');
  console.log('\nOptions:');
  console.log('  --sequential, -s    : Process plays sequentially (default: parallel)');
  console.log('  --workers N, -w N   : Number of parallel workers (default: 8, max: 8)\n');

  // Validate required arguments
  if (!jsonPath) {
    console.error('Error: json-path is required');
    process.exit(1);
  }

  try {
    if (useParallel) {
      console.log(`Mode: Parallel processing with up to ${maxWorkers} workers\n`);
      await processPlaysInParallel(jsonPath, startDate, maxWorkers);
    } else {
      console.log('Mode: Sequential processing\n');
      await processPlaysSequentially(jsonPath, startDate);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
