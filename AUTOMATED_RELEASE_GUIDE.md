# Automated Release Guide

This repository uses GitHub Actions to automate the release process, making it easy to publish new versions without manual steps.

## 🚀 Quick Release Process

### Option 1: Automatic Version Bump (Recommended)

1. **Go to GitHub Actions** in your repository
2. **Select "Bump Version" workflow**
3. **Click "Run workflow"**
4. **Fill in the form:**
   - **Bump type**: Choose `patch`, `minor`, or `major`
   - **Changelog entry**: Describe what changed (e.g., "Added caching and exclusion patterns")
5. **Click "Run workflow"**

**That's it!** The automation will:
- ✅ Bump the version in `package.json`
- ✅ Update `CHANGELOG.md` with your entry
- ✅ Commit and push the changes
- ✅ Trigger the Release workflow automatically
- ✅ Create a GitHub Release with the changelog
- ✅ Package and attach the `.vsix` file

### Option 2: Manual Version Update

If you prefer manual control:

1. **Update version in `package.json`**
   ```json
   "version": "0.2.0"
   ```

2. **Update `CHANGELOG.md`**
   ```markdown
   ## [0.2.0] - 2026-07-23

   ### Added
   - New feature X
   - New feature Y
   ```

3. **Commit and push to main**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore(release): v0.2.0"
   git push origin main
   ```

4. **Release workflow triggers automatically**
   - Creates git tag `v0.2.0`
   - Creates GitHub Release
   - Attaches `.vsix` file

## 📋 Workflow Details

### 1. Bump Version Workflow (`bump-version.yml`)

**Trigger**: Manual (workflow_dispatch)

**What it does:**
- Bumps version in `package.json` (patch/minor/major)
- Updates `CHANGELOG.md` with your entry
- Commits changes with message: `chore(release): vX.X.X`
- Pushes to main branch
- Triggers the Release workflow

**When to use:**
- Quick releases with simple changelog entries
- Automated version bumping
- Less manual work

### 2. Release Workflow (`release.yml`)

**Trigger**:
- Automatic: When `package.json` is pushed to main
- Manual: Via "Run workflow" button

**What it does:**
1. Extracts version from `package.json`
2. Checks if tag already exists (skips if yes)
3. Extracts changelog section for this version
4. Compiles and lints the code
5. Packages the extension (`.vsix`)
6. Creates git tag (e.g., `v0.2.0`)
7. Creates GitHub Release with:
   - Release notes from CHANGELOG
   - Attached `.vsix` file
8. Shows summary in Actions tab

**When it runs:**
- After Bump Version workflow completes
- When you manually update `package.json` and push
- When triggered manually from Actions tab

## 📝 Version Bump Types

- **patch** (0.1.0 → 0.1.1): Bug fixes, small improvements
- **minor** (0.1.0 → 0.2.0): New features, non-breaking changes
- **major** (0.1.0 → 1.0.0): Breaking changes, major rewrites

## 🔧 Customization

### Modify Changelog Format

Edit `.github/workflows/bump-version.yml` in the "Update CHANGELOG.md" step:

```yaml
- name: Update CHANGELOG.md
  run: |
    # Customize the format here
    cat > /tmp/new_changelog.md << EOF
    ## [$NEW_VERSION] - $DATE

    ### Added
    - $ENTRY
    EOF
```

### Change Trigger Conditions

Edit `.github/workflows/release.yml`:

```yaml
on:
  push:
    branches:
      - main  # Change branch
    paths:
      - 'package.json'  # Watch other files
```

### Add Publishing to Marketplace

Add this step to `release.yml` after packaging:

```yaml
- name: Publish to VS Code Marketplace
  run: npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}
  env:
    VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

**Note**: You'll need to add `VSCE_PAT` secret in repository settings.

## 🐛 Troubleshooting

### Release workflow doesn't trigger

**Problem**: Pushed `package.json` but no release created

**Solution**:
- Check Actions tab for errors
- Verify `package.json` is in the root directory
- Ensure version was actually changed
- Manually trigger workflow from Actions tab

### Tag already exists error

**Problem**: Tag `vX.X.X` already exists

**Solution**:
- The workflow skips tag creation if it exists
- Delete the tag if you need to recreate it:
  ```bash
  git tag -d v0.2.0
  git push origin :refs/tags/v0.2.0
  ```

### Changelog extraction is empty

**Problem**: Release notes are blank

**Solution**:
- Ensure CHANGELOG.md follows this format:
  ```markdown
  ## [0.2.0] - 2026-07-23

  ### Added
  - Feature description

  ## [0.1.0] - 2026-07-23
  ```
- Version must match exactly (including brackets)

### VSIX file not attached

**Problem**: Release created but no `.vsix` file

**Solution**:
- Check Actions logs for packaging errors
- Ensure `npm ci` and `npm run compile` succeed
- Verify `@vscode/vsce` is available

## 🔐 Required Permissions

The workflows need these permissions (already configured):

- **contents: write** - Create tags, releases, and commits
- **GITHUB_TOKEN** - Automatically provided by GitHub Actions

No additional secrets needed unless publishing to marketplace.

## 📦 Manual Publishing to VS Code Marketplace

After the release is created:

1. **Download the `.vsix` file** from the GitHub Release
2. **Follow the [Manual Update Guide](MANUAL_UPDATE_GUIDE.md)**:
   - Go to VS Code Marketplace management
   - Upload the `.vsix` file manually

Or set up automated publishing with VSCE PAT token (see Customization section).

## 🎯 Best Practices

1. **Use Bump Version workflow** for routine releases
2. **Keep changelog entries descriptive** but concise
3. **Test locally** before pushing version changes
4. **Use semantic versioning** correctly (patch/minor/major)
5. **Review the generated release** on GitHub after automation runs
6. **Tag important releases** as "Latest" on GitHub

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
