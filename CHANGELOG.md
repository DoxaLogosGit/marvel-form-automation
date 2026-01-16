# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-01-15

### Added
- **Dry-run mode** for testing form filling without submission
- New `--dry-run` / `-d` command-line flag
- Warning message displayed when in dry-run mode: "⚠️  DRY RUN MODE: Forms will be filled but NOT submitted"
- Dry-run mode works with both parallel and sequential processing
- Documentation section explaining dry-run usage and benefits

### Changed
- FormSubmitter class constructor now accepts optional `dryRun` parameter
- `submitPlay` method skips form submission when `dryRun` is true
- Both `processPlaysInParallel` and `processPlaysSequentially` support dry-run parameter

### Technical
- No form submissions occur when `--dry-run` flag is used
- Useful for testing data accuracy before actual submissions
- Prevents invalid or duplicate data during testing phase

## [2.1.0] - 2026-01-15

### Changed
- **Refactored codebase into modular architecture** for better maintainability
- Split monolithic 896-line file into 6 focused modules:
  - `types.ts` - Type definitions
  - `constants.ts` - All constants and mappings
  - `utils.ts` - Utility functions
  - `form-submitter.ts` - FormSubmitter class
  - `parallel-processor.ts` - Worker orchestration
  - `index.ts` - Main entry point
- Main entry point changed from `src/submit-forms.ts` to `src/index.ts`
- Extracted `filterPlays()` function for reuse between parallel/sequential modes

### Added
- Clear separation of concerns with single-responsibility modules
- Better code organization and discoverability
- Easier testing of individual components
- Improved maintainability for future enhancements

### Technical
- Each module is 150-400 lines (vs original 896-line monolith)
- All modules use ES6 imports/exports
- TypeScript type safety maintained across all modules
- No functional changes - all features work identically

## [2.0.0] - 2026-01-15

### Changed
- **BREAKING: Form submissions now active** - Tool now actually submits forms to Google Forms
- Uncommented submit button in production code
- Updated documentation to reflect production-ready status
- Changed "Enabling Form Submission" section to "Before Running" with testing guidance
- Enhanced disclaimer to emphasize thorough testing before full dataset processing

### Added
- Guidance for headful mode testing (watch browser in real-time)
- Recommendation to start with small batches
- Step-by-step first-time setup instructions

### Removed
- Safety warnings about commented submit button
- Instructions for uncommenting code manually

## [1.2.0] - 2026-01-15

### Changed
- **Migrated from Node.js to Bun** for faster execution and simpler development
- Updated all package.json scripts to use `bun` instead of `npm`/`node`
- Changed main entry point to TypeScript source file (Bun runs TS directly)
- Updated all documentation to reference Bun instead of npm/Node.js
- Updated usage messages in code to show `bun start` commands

### Added
- New `install:browsers` script for Playwright browser installation with Bun
- "Why Bun?" section in README explaining benefits
- Type module support in package.json

### Technical
- No build step required for development - Bun runs TypeScript natively
- Faster startup time and improved performance
- Simpler development workflow without transpilation step
- Backward compatible with all Node.js APIs used

## [1.1.0] - 2026-01-15

### Added
- **Parallel processing support** with up to 8 concurrent workers
- New command-line options: `--sequential` / `-s` and `--workers N` / `-w N`
- Worker-based architecture with independent browser instances
- Chunk-based play distribution for parallel execution
- Worker-specific logging with `[Worker N]` prefixes
- New npm scripts: `test:sequential` and `test:workers`
- Performance statistics in final summary (time elapsed, average time per play)
- Comprehensive parallel processing documentation

### Changed
- **BREAKING**: `json-path` is now a required argument (no longer has a default value)
- Default mode is now parallel processing with 8 workers (was sequential)
- Updated usage examples to show parallel and sequential modes
- Enhanced error handling for parallel worker failures
- Improved console output for tracking multiple workers
- Updated package.json test scripts with better date filtering

### Performance
- ~8x faster processing for large datasets with 8 workers
- Reduced 100-play processing time from ~17 minutes to ~2.5 minutes
- Scalable from 1-8 workers based on system resources

## [1.0.0] - 2026-01-15

### Added
- Initial standalone release
- Automated form submission for Marvel Champions play data
- Support for modular encounter sets
- Date range filtering for incremental updates
- Difficulty parsing (S1, S1E1, S2E2, Heroic, etc.)
- Special handling for Spider-Woman dual aspects
- Hero and villain name mappings
- Safety feature: submit button commented out by default
- Comprehensive filtering statistics display
- Sample test data file
- Full documentation in README.md

### Features
- 5-page Google Form automation
- Solo and multiplayer game support
- Automatic filtering of plays with empty modular sets
- Command-line arguments for JSON path and date filtering
- Detailed logging and progress output

### Technical
- Built with TypeScript and Playwright
- Node.js v16+ support
- Configurable timeouts for form navigation
- Error handling and warnings for mismatched data
