# Manual Extension Update Guide

Use this guide when you need to update the VS Code Marketplace extension without using `vsce publish` command.

## Prerequisites

- Extension is already packaged (`.vsix` file exists)
- You have access to the VS Code Marketplace publisher account

## Steps to Update Extension Manually

### 1. Package the Extension (if not already done)

```bash
npm run compile
vsce package
```

This creates a file like `file-size-viewer-x.x.x.vsix` in your project root.

### 2. Go to Marketplace Management Page

Visit: https://marketplace.visualstudio.com/manage/publishers/yash-c71e123f-dc39-4c65-82bf-a7e6c9278f10

### 3. Sign In

Sign in with your Microsoft/GitHub account (the same account used to publish the extension originally).

### 4. Find Your Extension

Look for **"file-size-viewer"** in your list of published extensions.

### 5. Update the Extension

1. **Click the three dots** (...) menu next to the extension
2. Select **"Update"** from the dropdown
3. **Click "Upload"** button
4. Select the `.vsix` file from your `file-size-viewer` folder (e.g., `file-size-viewer-0.0.4.vsix`)
5. **Click "Upload"** to publish the update

### 6. Verify the Update

- The extension will be processed within a few minutes
- Check the marketplace page to confirm the new version is live
- You may receive an email confirmation

## Troubleshooting

### Can't Access Management Page

- Make sure you're signed in with the correct Microsoft/GitHub account
- Clear browser cache and try again
- Try accessing https://marketplace.visualstudio.com first, then navigate to manage

### Upload Fails

- Ensure the version in `package.json` is higher than the currently published version
- Check that the `.vsix` file is not corrupted (try repackaging)
- Verify all required fields in `package.json` are filled

### Extension Not Updating

- Wait 5-10 minutes for propagation
- Clear VS Code extension cache
- Check for validation errors in the marketplace management portal

## Alternative: Using vsce with PAT Token

If you have a Personal Access Token:

```bash
# Login once
vsce login yash-c71e123f-dc39-4c65-82bf-a7e6c9278f10

# Then publish
vsce publish
```

## Notes

- Always increment the version number in `package.json` before packaging
- Update `CHANGELOG.md` with release notes
- Create a git tag for the release: `git tag -a vX.X.X -m "Release vX.X.X"`
- The manual upload method doesn't require Azure DevOps PAT tokens
