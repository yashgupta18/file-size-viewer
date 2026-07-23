# Change Log

All notable changes to the "file-size-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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