# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
