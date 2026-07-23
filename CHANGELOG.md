# Change Log

All notable changes to the "file-size-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.2] - 2026-07-23

### Changed
- feat: add Activity Bar view with workspace statistics and quick dashboard access

## [0.1.1] - 2026-07-23

### Changed
- Testing fixed automated release workflows

## [0.1.0] - 2026-07-23

### Added
- **Smart Caching**: File and folder sizes are now cached for improved performance
- **Automatic Cache Invalidation**: Cache automatically updates when files are created, modified, or deleted via file system watchers
- **Exclusion Patterns**: Configure folders and files to exclude from size calculation (default: node_modules, .git, dist, out, build, .vscode)
- **Configurable Recursion Depth**: Set maximum folder depth for recursive size calculation (default: 10, range: 1-50)
- **Toggle Folder Size Calculation**: Option to disable folder size calculation for very large repositories
- **Wildcard Support**: Exclusion patterns support wildcards (e.g., *.log, *.tmp)
- **Cache Control**: Option to enable/disable caching via settings

### Changed
- Improved performance for large repositories with smart caching
- Better resource management with proper disposal of file watchers and EventEmitter
- Enhanced cache invalidation on file create, change, and delete events
- Optimized folder size calculation with depth limits and exclusions

### Performance
- Cached results reduce repeated file system scans
- Excluded folders (like node_modules) are skipped automatically
- Configurable depth limits prevent excessive recursion

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