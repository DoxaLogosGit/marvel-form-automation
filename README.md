# Marvel Champions Form Automation

Automated TypeScript/Playwright tool for submitting Marvel Champions: The Card Game play data to the community statistics Google Form.

## Overview

This tool automates the submission of play data to help contribute to community statistics tracking for Marvel Champions. It processes JSON-formatted play data and fills out the multi-page Google Form with hero selections, aspects, villains, modular encounter sets, difficulty settings, and win/loss results.

## Features

- ✅ **Parallel processing with up to 8 workers** for fast bulk submissions
- ✅ Automatically fills out the 5-page Google Form with play data
- ✅ Supports modular encounter set selection
- ✅ Filters out plays with empty modular sets (special scenarios)
- ✅ Date range filtering (only submit plays after a specific date)
- ✅ Difficulty parsing (S1E1, S2E2, Heroic, etc.)
- ✅ Handles solo and multiplayer games
- ✅ Special support for Spider-Woman dual aspects
- ✅ Sequential mode available for debugging
- ✅ **Production ready** - actively submits forms to Google Forms

## Prerequisites

### System Requirements

- [Bun](https://bun.sh) (v1.0 or higher) - A fast all-in-one JavaScript runtime

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd marvel-form-automation

# Install dependencies
bun install

# Install Playwright browsers
bun run install:browsers
```

## JSON Data Format

This tool expects a JSON file containing an array of play records. Each play should have the following structure:

```json
{
  "Id": "100672696",
  "Date": "2025-06-26",
  "Villain": "Klaw",
  "Difficulty": "S1E1",
  "Multiplayer": false,
  "True_Solo": true,
  "Heroes": [
    {
      "Hero": "Winter Soldier",
      "Aspect": "Aggression",
      "Win": 0
    }
  ],
  "Modular_Sets": [
    "Masters of Evil"
  ]
}
```

### Field Descriptions

- **Id**: Unique identifier for the play (string)
- **Date**: Play date in `YYYY-MM-DD` format
- **Villain**: Villain/scenario name
- **Difficulty**: Difficulty string (see format below)
- **Multiplayer**: Boolean indicating if multiplayer
- **True_Solo**: Boolean indicating true solo play
- **Heroes**: Array of hero objects with:
  - **Hero**: Hero name
  - **Aspect**: Aspect name (or dual aspects for Spider-Woman like "Justice & Aggression")
  - **Win**: 1 for win, 0 for loss
- **Modular_Sets**: Array of modular encounter set names used in the scenario

### Difficulty Format

The tool supports these difficulty notations:

- `S1` → Standard (Core Set)
- `S2` → Standard II (The Hood)
- `S3` → Standard III (Age of Apocalypse)
- `S1E1` → Standard (Core Set) + Expert (Core Set)
- `S1E2` → Standard (Core Set) + Expert II (The Hood)
- `S2E1` → Standard II (The Hood) + Expert (Core Set)
- `S2E2` → Standard II (The Hood) + Expert II (The Hood)
- `S3E1` → Standard III (Age of Apocalypse) + Expert (Core Set)
- `S3E2` → Standard III (Age of Apocalypse) + Expert II (The Hood)
- `Heroic` → Heroic difficulty

## Usage

### Test Mode (Recommended First)

Test with a small number of plays using the sample data:

```bash
bun test
```

This processes the `sample_play_data.json` file with a date filter to ensure everything works correctly.

### Process All Plays (Parallel Mode - Default)

By default, the tool uses parallel processing with up to 8 workers for maximum speed:

```bash
bun start your_play_data.json
```

### Process Plays After Specific Date

Only submit plays on or after a specific date:

```bash
bun start your_play_data.json 2025-01-01
```

This is useful for incremental updates - only submitting new plays since your last submission.

### Command Line Arguments

```bash
bun src/submit-forms.ts <json-path> [start-date] [options]
```

**Parameters:**
- `json-path` (required): Path to your JSON file containing play data
- `start-date` (optional): Only process plays on or after this date in `YYYY-MM-DD` format

**Options:**
- `--sequential` or `-s`: Use sequential processing instead of parallel (useful for debugging)
- `--workers N` or `-w N`: Set number of parallel workers (default: 8, max: 8)

**Examples:**

```bash
# Process all plays with 8 workers (default parallel mode)
bun start marvel_play_data.json

# Process plays from 2025 onwards with parallel processing
bun start marvel_play_data.json 2025-06-01

# Use sequential mode for debugging
bun start marvel_play_data.json 2025-06-01 --sequential

# Use 4 workers instead of 8
bun start marvel_play_data.json 2025-06-01 --workers 4

# Test with sample data using sequential mode
bun run test:sequential

# Test with sample data using 4 workers
bun run test:workers
```

## Filtering Logic

The script applies two filters **in order**:

1. **Empty Modular Sets**: Automatically skips plays with empty `Modular_Sets` arrays
   - These are typically special scenarios (Mojo, Spiral, Magog, The Hood) that don't use standard modular sets

2. **Start Date**: If provided, only processes plays on or after the specified date

### Filter Summary Output

The script displays detailed filtering statistics before processing:

```
=== Filtering Summary ===
Total plays in file: 1142
Skipped (empty modular sets): 18
Start date filter: 2026-01-01
Skipped (before start date): 950
Plays to process: 174
```

## Performance and Parallel Processing

### How Parallel Processing Works

The tool uses multiple browser instances running simultaneously to process plays in parallel:

1. **Data Splitting**: Your plays are divided into equal chunks (one per worker)
2. **Worker Initialization**: Each worker launches its own browser instance
3. **Parallel Execution**: All workers process their chunks simultaneously
4. **Result Aggregation**: Results are combined and reported at the end

Each worker is completely independent, with its own browser instance and processing queue. Workers are labeled `[Worker 1]`, `[Worker 2]`, etc. in the console output for easy tracking.

### Performance Benefits

Parallel processing dramatically reduces total processing time:

| Plays | Sequential | 4 Workers | 8 Workers |
|-------|------------|-----------|-----------|
| 40    | ~7 min     | ~2 min    | ~1 min    |
| 100   | ~17 min    | ~5 min    | ~2.5 min  |
| 200   | ~33 min    | ~9 min    | ~5 min    |
| 500   | ~83 min    | ~21 min   | ~11 min   |

*Assumes ~10 seconds per play. Actual times may vary based on network speed and form complexity.*

### When to Use Sequential Mode

Use sequential mode (`--sequential`) when:
- **Debugging**: Easier to follow console output with one worker
- **Rate Limiting Concerns**: If you encounter rate limiting from Google Forms
- **Low Play Count**: < 10 plays don't benefit much from parallelization
- **Testing**: When verifying form fill accuracy before actual submission

### Resource Usage

Each worker runs a separate Chromium browser instance:
- **Memory**: ~150-200 MB per worker
- **CPU**: Scales linearly with worker count
- **Network**: Each worker makes independent form requests

For 8 workers, expect ~1.2-1.6 GB of RAM usage. Reduce worker count with `--workers` if you have memory constraints.

## Before Running

**IMPORTANT**: This tool actively submits forms to Google Forms. Please verify your data before running.

### First Time Setup & Testing

Before processing your full dataset:

1. **Test with sample data first:**
   ```bash
   bun test
   ```

2. **Run in headful mode** (optional) to watch the browser:
   - Edit `src/submit-forms.ts`
   - Change `headless: true` to `headless: false` (around line 131)
   - This lets you see the form being filled out in real-time

3. **Verify form accuracy** by watching a few submissions:
   - Heroes are selected correctly
   - Aspects match your data
   - Villains/scenarios are correct
   - Modular sets are selected properly
   - Difficulty settings are accurate
   - Win/loss is correct

4. **Start small** - Process a few plays first:
   ```bash
   bun start your_data.json 2025-12-01  # Only recent plays
   ```

5. **Scale up** once confident everything works correctly

## How It Works

The script navigates through the 5-page Google Form:

1. **Page 1**: Select hero from dropdown
2. **Page 2**: Select hero aspect and indicate if there's a second hero
3. **Page 3**: Select villain/scenario
4. **Page 4**: Select modular encounter sets (checkboxes)
   - Uses the `Modular_Sets` array from your JSON
   - Some scenarios skip this page entirely (e.g., Wrecking Crew)
5. **Page 5**: Select win/loss, standard set, expert set, and heroic mode

## Troubleshooting

### "Could not find modular set" Warnings

If you see warnings like:
```
Warning: Could not find modular set "Some Set Name"
```

This means the modular set name in your JSON doesn't exactly match a form option. Check:
- Spelling and capitalization
- Whether the form has been updated with new sets
- The set name in your source data

### Date Format Errors

Dates must be in `YYYY-MM-DD` format:
- ✅ Correct: `2026-01-01`, `2025-06-15`
- ❌ Wrong: `01/01/2026`, `2026-1-1`, `Jan 1 2026`

### No Plays Being Processed

If all plays are being skipped:
- Check that your JSON file includes the `Modular_Sets` field
- Verify the start date isn't after all your plays
- Ensure not all modular sets are empty arrays

### Hero/Villain Name Mismatches

The script includes mappings for common name variations. If a hero or villain isn't found:
- Check the `HERO_NAME_MAPPINGS` in `src/submit-forms.ts`
- Check the `VILLAIN_NAME_MAPPINGS` in `src/submit-forms.ts`
- Add your variation to the appropriate mapping object

## Development

### Why Bun?

This project uses [Bun](https://bun.sh) for several advantages:
- **Runs TypeScript directly** - No build step required for development
- **Faster execution** - Bun is significantly faster than Node.js
- **Built-in TypeScript support** - No configuration needed
- **Drop-in replacement** - Compatible with Node.js APIs and npm packages

### Run Directly

```bash
# Parallel with 8 workers (default)
bun src/submit-forms.ts path/to/data.json

# Sequential mode
bun src/submit-forms.ts path/to/data.json 2025-06-01 --sequential

# Custom worker count
bun src/submit-forms.ts path/to/data.json 2025-06-01 --workers 4
```

### Available Bun Scripts

```bash
bun run build              # Build to dist/ directory (optional, for distribution)
bun run dev                # Run TypeScript directly (same as start)
bun test                   # Test with sample data (parallel, 8 workers)
bun run test:sequential    # Test with sample data (sequential mode)
bun run test:workers       # Test with sample data (4 workers)
bun run install:browsers   # Install Playwright browsers
```

### Development Workflow

No build step needed! Bun runs TypeScript directly:

```bash
# Edit src/submit-forms.ts, then run immediately
bun src/submit-forms.ts your_data.json
```

## Project Structure

```
marvel-form-automation/
├── src/
│   └── submit-forms.ts    # Main automation script
├── dist/                  # Compiled JavaScript (generated)
├── sample_play_data.json  # Example data for testing
├── package.json           # NPM configuration
├── package-lock.json      # Locked dependency versions
├── tsconfig.json          # TypeScript configuration
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Data Source Integration

This tool is designed to work with JSON data exported from play tracking systems. If you're manually creating the JSON:

1. Follow the exact field structure shown in the "JSON Data Format" section
2. Ensure dates are in `YYYY-MM-DD` format
3. Use correct difficulty notation
4. Include all modular encounter sets used

For automated data extraction from BoardGameGeek, see the [marvelchamppy](https://github.com/yourusername/marvelchamppy) project which generates compatible JSON output.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests for:

- Bug fixes
- New hero/villain name mappings
- Enhanced error handling
- Additional form field support
- Documentation improvements

## License

MIT License - feel free to use and modify as needed.

## Disclaimer

This tool is for personal use to contribute to community statistics. Please:
- **Test thoroughly** before processing your full dataset
- Verify all data before submission
- Don't submit duplicate or inaccurate data
- Use responsibly and respect the form owner's guidelines
- Start with small batches to ensure accuracy

## Acknowledgments

- Thanks to the Marvel Champions community for maintaining the statistics form
- Built with [Bun](https://bun.sh) for blazing-fast TypeScript execution
- Powered by [Playwright](https://playwright.dev/) for reliable browser automation
- Part of the Marvel Champions data tracking ecosystem
