# File Size Viewer Future Features Roadmap

This document captures planned features for upcoming releases. The roadmap is organized into progressive batches so users get value quickly while larger capabilities are built in parallel.

## Vision

Help VS Code users understand and manage file size health across their workspace with clear Explorer signals, deep dashboard insights, and practical reporting workflows.

## Batch 1: Foundation and Explorer Upgrades

Target: speed, trust, and customization for all users.

### 1. Full Color-Range Customization ✅ COMPLETED
- ✅ Allow users to define size limits for each color band (green, yellow, red).
- ✅ Validate threshold rules so ranges do not overlap.
- ✅ Improve settings descriptions with examples (bytes, KB, MB).

### 2. Exclusions and Scan Guards ✅ COMPLETED
- ✅ Add configurable exclude patterns (for example: `node_modules`, `.git`, `dist`, `build`).
- ✅ Add optional max recursion depth for folder scans.
- ✅ Add toggle to disable folder recursive size calculation in very large repos.

### 3. Caching and Smart Invalidation ✅ COMPLETED
- ✅ Cache computed file/folder sizes to reduce repeated scans.
- ✅ Invalidate cache on file create/change/delete via workspace watchers.
- ✅ Keep manual refresh command as a fallback force-refresh.

### 4. Explorer Context Actions ✅ COMPLETED
- ✅ Copy file size for selected file/folder.
- ✅ Open largest file in selected folder.
- ✅ Show top files in selected folder (quick pick action).

## Batch 2: Dashboard and Visualizations

Target: a dedicated page for analysis, sorting, and filtering.

### 5. Dedicated Dashboard Page (Webview) ✅ COMPLETED
- ✅ Create a command to open a separate dashboard page.
- ✅ Show top N largest files/folders.
- ✅ Provide sorting by size, path, extension, and file type.

### 6. Filters and Presets
- Add min/max size filters.
- Add extension filters (for example: `.log`, `.mp4`, `.map`).
- Add folder/path filters.
- Save and reuse filter presets.

### 7. Graphs and Visual Analytics
- Add top-files bar chart.
- Add folder distribution treemap.
- Click chart items to open files in editor.

## Batch 3: Reporting and Insights

Target: shareable output and historical understanding.

### 8. Export Reports
- Export current dashboard view to CSV.
- Export current dashboard view to JSON.
- Ensure export respects active filters and sorting.

### 9. Trend Snapshots
- Optional periodic snapshots of workspace size state.
- Show growth over time by folder and extension.
- Add retention policy (for example: keep last 30 snapshots).

### 10. Alerts and Status Summary
- Optional warning when opening files above critical threshold.
- Optional status bar summary for quick workspace size signal.

## Batch 4: Quality and Release Readiness

Target: reliability and maintainability as features grow.

### 11. Test Coverage
- Unit tests for size formatting and color-band mapping.
- Unit tests for exclusion and recursion logic.
- Integration tests for commands and dashboard interactions.

### 12. Documentation and Release Hygiene
- Keep README aligned with shipped capabilities.
- Add screenshots and usage examples for dashboard/filters/charts.
- Update CHANGELOG by batch with clear migration notes.

## Proposed Release Sequence

- v0.1.x: Batch 1 (Explorer speed + customization + core actions)
- v0.2.x: Batch 2 (dashboard + filters + charts)
- v0.3.x: Batch 3 (exports + trends + alerts)
- v0.4.x: Batch 4 stabilization (test depth + docs + polish)

## Success Criteria

- Large repositories remain responsive with exclusions and caching.
- Users can define color thresholds confidently without ambiguity.
- Dashboard makes it easy to identify and act on heavy files quickly.
- Reports are useful for personal cleanup and team communication.

## Feature Release and Push Steps

Use this checklist whenever a planned feature is complete and ready to ship.

### 1. Sync and Create a Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feat/<short-feature-name>
```

### 2. Implement the Feature
- Build the feature in small commits.
- Keep related docs updated while coding (`README.md`, this roadmap, command docs).

### 3. Validate Before Commit
```bash
npm install
npm run lint
npm run test
npm run compile
```

### 4. Commit with a Clear Message
```bash
git add .
git commit -m "feat: add <feature summary>"
```

### 5. Push Feature Branch
```bash
git push -u origin feat/<short-feature-name>
```

### 6. Open and Merge Pull Request
- Open a PR from `feat/<short-feature-name>` into `main`.
- Add description, screenshots (if UI changes), and testing notes.
- Address review comments, then merge.

### 7. Prepare Release on Main
```bash
git checkout main
git pull origin main
```

- Update `CHANGELOG.md` with the new feature and any migration notes.
- Bump extension version in `package.json` (for example `0.1.2` -> `0.2.0` for minor feature release).

### 8. Commit Release Metadata
```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): v<new-version>"
git push origin main
```

### 9. Tag and Push the Release Tag
```bash
git tag -a v<new-version> -m "Release v<new-version>"
git push origin v<new-version>
```

### 10. Publish Extension (When Ready)
```bash
vsce package
vsce publish
```

Optional: create a GitHub Release using tag `v<new-version>` and paste changelog highlights.
