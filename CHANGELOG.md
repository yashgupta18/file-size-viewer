# Change Log

All notable changes to the "file-size-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- **Smart Caching**: File and folder sizes are now cached for improved performance
- **Automatic Cache Invalidation**: Cache automatically updates when files are created, modified, or deleted
- **Exclusion Patterns**: Configure folders and files to exclude from size calculation (e.g., node_modules, .git, dist)
- **Configurable Recursion Depth**: Set maximum folder depth for recursive size calculation
- **Toggle Folder Size Calculation**: Option to disable folder size calculation for very large repositories
- **Wildcard Support**: Exclusion patterns support wildcards (e.g., *.log, *.tmp)

### Changed
- Improved performance for large repositories with smart caching
- Better resource management with proper disposal of file watchers
- Enhanced logging for debugging cache behavior

## [0.0.4] - 2026-07-23

### Fixed
- Fixed DisposableStore memory leak by properly disposing EventEmitter in FileDecorationProvider
- Extension now correctly cleans up resources on deactivation/reload

## [0.0.3] - Previous release

### Added
- Customizable color thresholds for file size bands (green, yellow, red)
- File size decorations in VS Code Explorer
- Folder size calculation with recursive scanning
- Configuration validation and error handling

## [Unreleased]

- Initial release