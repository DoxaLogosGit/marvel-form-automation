# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
