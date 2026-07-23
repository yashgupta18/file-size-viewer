# 📂 File Size Viewer - VS Code Extension

[![VS Code Marketplace](https://img.shields.io/badge/VSCode-File%20Size%20Viewer-blue?style=flat&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=your-unique-id)

Display file sizes directly in the VS Code file explorer!

## ✨ Features

✅ Show file sizes next to each file in the explorer.
✅ Display folder sizes when expanded.
✅ Customizable thresholds for small, medium, and large files.
✅ Colored icons to indicate file sizes (🔴 Red for large, 🟡 Yellow for medium, 🟢 Green for small).
✅ **Smart caching** for improved performance - cache is automatically invalidated on file changes.
✅ **Exclusion patterns** to skip node_modules, .git, and other folders you don't want to scan.
✅ **Configurable recursion depth** for deep directory structures.
✅ **Explorer context actions** - Copy file size, open largest file, show top files.
✅ **Interactive Dashboard** - View top largest files across your workspace with sorting, filtering, and search.
✅ Option to disable folder size calculation for very large repositories.

## 📥 Installation

### From the VS Code Marketplace

1. Open **VS Code**
2. Go to **Extensions** (`Ctrl + Shift + X`)
3. Search for `File Size Viewer`
4. Click **Install**

### Manual Installation

1. Download the `.vsix` file from [Releases](https://github.com/yashgupta18/file-size-viewer/releases)
2. Open **VS Code** and run:
   ```sh
   code --install-extension file-size-viewer.vsix
   ```

## 🚀 Usage

Once installed, file sizes will appear next to files in the **Explorer**.

### Activity Bar

Click the **File Size Viewer** icon in the Activity Bar (left sidebar) to:
- 📊 View quick workspace statistics
- 💾 See total files and total size
- 🔴 Find your largest file
- 📈 Open the full dashboard with one click

### Dashboard

Open the interactive dashboard to analyze file sizes across your entire workspace:

**Method 1:** Click the **File Size Viewer** icon in the Activity Bar, then click "Open Dashboard"

**Method 2:** Use the Command Palette:
1. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type: **"File Size Viewer: Open Dashboard"**

Dashboard features:
   - 📊 View top 50-500 largest files
   - 🔍 Search and filter by name or extension
   - 📈 See total size statistics
   - 🎯 Sort by size, name, extension, or path
   - 📂 Open files or reveal in Explorer with one click
   - 📋 Copy file paths to clipboard
   - 🎛️ **Advanced Filters**: Min/max size, folder path filtering
   - 💾 **Save and load filter presets** for quick analysis

### Quick Actions

Right-click any file or folder in the Explorer to access these actions:

- **Copy File Size** - Copy the size of a file or folder to clipboard
- **Open Largest File in Folder** - Quickly open the largest file in a folder
- **Show Top Files in Folder** - View and select from the top 20 largest files in a folder

### Configuration

- **Set File Size Thresholds**
  Go to **Settings (`Ctrl + ,`)** and search for `File Size Viewer`.
  Customize thresholds for **small**, **medium**, and **large** files.

- **Configure Exclusions**
  Add patterns to exclude from size calculation (default: `node_modules`, `.git`, etc.)

- **Refresh File Sizes**
  Right-click the explorer and select: `Refresh File Size Viewer`

## ⚙️ Configuration

Modify settings via VS Code settings:

### Color Thresholds

| Setting                     | Description                                 | Default Value |
| --------------------------- | ------------------------------------------- | ------------- |
| `fileSizeViewer.greenMaxBytes`  | Maximum bytes for green 🟢 band            | `1048576`     |
| `fileSizeViewer.yellowMinBytes` | Minimum bytes for yellow 🟡 band           | `1048577`     |
| `fileSizeViewer.yellowMaxBytes` | Maximum bytes for yellow 🟡 band           | `104857600`   |
| `fileSizeViewer.redMinBytes`    | Minimum bytes for red 🔴 band              | `104857601`   |

### Performance and Exclusions

| Setting                     | Description                                 | Default Value |
| --------------------------- | ------------------------------------------- | ------------- |
| `fileSizeViewer.excludePatterns` | Folders/files to exclude from size calculation | `["node_modules", ".git", "dist", "out", "build", ".vscode"]` |
| `fileSizeViewer.maxRecursionDepth` | Maximum folder depth for size calculation | `10` |
| `fileSizeViewer.enableFolderSizeCalculation` | Enable recursive folder size calculation | `true` |
| `fileSizeViewer.enableCache` | Enable caching of computed sizes | `true` |

Notes:
- Values are in bytes.
- Example conversions: `1024 = 1KB`, `1048576 = 1MB`, `104857600 = 100MB`.
- Validation rules: `greenMaxBytes < yellowMinBytes <= yellowMaxBytes < redMinBytes`.
- Exclude patterns support exact names (`node_modules`) and wildcards (`*.log`).
- Cache is automatically invalidated when files change.
- Lower `maxRecursionDepth` improves performance in deep directory structures.
- Disable `enableFolderSizeCalculation` for very large repositories to improve performance.

## 🛠️ Development

### Clone the repository

```sh
git clone https://github.com/yourusername/file-size-viewer.git
cd file-size-viewer
npm install
```

### Run in VS Code

1. Open the project in VS Code
2. Press `F5` to run the extension in a new **Extension Host Window**

## 📜 License

MIT License © 2025 [Your Name](https://github.com/yashgupta18)

---

🌟 If you find this extension useful, **give it a star ⭐ on GitHub!**
