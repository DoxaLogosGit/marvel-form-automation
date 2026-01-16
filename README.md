# Marvel Champions Form Automation

Automated TypeScript/Playwright tool for submitting Marvel Champions: The Card Game play data to the community statistics Google Form.

## Overview

This tool automates the submission of play data to help contribute to community statistics tracking for Marvel Champions. It processes JSON-formatted play data and fills out the multi-page Google Form with hero selections, aspects, villains, modular encounter sets, difficulty settings, and win/loss results.

## Features

- ✅ Automatically fills out the 5-page Google Form with play data
- ✅ Supports modular encounter set selection
- ✅ Filters out plays with empty modular sets (special scenarios)
- ✅ Date range filtering (only submit plays after a specific date)
- ✅ Difficulty parsing (S1E1, S2E2, Heroic, etc.)
- ✅ Handles solo and multiplayer games
- ✅ Special support for Spider-Woman dual aspects
- ✅ Submit button **commented out by default** for safety

## Prerequisites

### System Requirements

- Node.js (v16 or higher)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd marvel-form-automation

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
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
npm test
```

This processes the `sample_play_data.json` file with a date filter to ensure everything works correctly.

### Process All Plays

Process all plays from your JSON file:

```bash
npm start your_play_data.json
```

### Process Plays After Specific Date

Only submit plays on or after a specific date:

```bash
npm start your_play_data.json 2025-01-01
```

This is useful for incremental updates - only submitting new plays since your last submission.

### Command Line Arguments

```bash
node dist/submit-forms.js [json-path] [start-date]
```

**Parameters:**
- `json-path`: Path to your JSON file containing play data
- `start-date` (optional): Only process plays on or after this date in `YYYY-MM-DD` format

**Examples:**

```bash
# Process all plays in file
npm start ../my_plays.json

# Process only plays from 2026 onwards
npm start ../my_plays.json 2026-01-01

# Process plays from June 2025 onwards
npm start ../my_plays.json 2025-06-01
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

## Enabling Form Submission

**IMPORTANT**: The submit button is **commented out by default** for safety.

### Before Enabling Submission

1. Run the script in test mode first
2. Watch the browser window as it fills out the form
3. Verify that:
   - Heroes are selected correctly
   - Aspects match your data
   - Villains/scenarios are correct
   - Modular sets are selected properly
   - Difficulty settings are accurate
   - Win/loss is correct

### To Enable Actual Submission

Once you've verified everything looks correct:

1. Open `src/submit-forms.ts` in your editor
2. Find the submit section (around line 170)
3. Uncomment these lines:

```typescript
// await this.page.click('text=Submit');
// await this.page.waitForLoadState('networkidle');
// console.log('  ✓ Form submitted successfully!');
```

4. Rebuild and run:

```bash
npm run build
npm start your_play_data.json
```

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

### Build Only

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Run Directly

```bash
node dist/submit-forms.js path/to/data.json
```

### Watch Mode (for development)

```bash
npm run dev
```

Automatically rebuilds on file changes.

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
- Verify all data before submission
- Don't submit duplicate or inaccurate data
- Use responsibly and respect the form owner's guidelines
- Keep the submit button commented out until you've thoroughly tested

## Acknowledgments

- Thanks to the Marvel Champions community for maintaining the statistics form
- Built with [Playwright](https://playwright.dev/) for reliable browser automation
- Part of the Marvel Champions data tracking ecosystem
