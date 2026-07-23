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

- **Set File Size Thresholds**
  Go to **Settings (`Ctrl + ,`)** and search for `File Size Viewer`.
  Customize thresholds for **small**, **medium**, and **large** files.

- **Refresh File Sizes**
  If file sizes are not updating, right-click the explorer and click:
  `Refresh File Size Viewer`.

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
