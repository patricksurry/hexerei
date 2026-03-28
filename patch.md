## 1. The `>new` and `>open` Commands (Map Initialization)

We will introduce a modal dialog triggered by the `>new` command (or Cmd+N) that scaffolds a fresh `HexMapDocument`, as well as an `>open` command to load existing files from disk.

### The `>open` Command
- Adds an `>open` command to the command bar (and standard keyboard shortcut `Cmd+O`).
- Executing this command triggers a native file selection dialog (via a hidden `<input type="file" accept=".yaml,.json">`).
- Once a file is selected, it reads the content using the HTML5 `FileReader` API.
- The content is parsed with `MapModel.load(yamlSource)`, replacing the current `MapModel` and `CommandHistory`.

### UI Component (`NewMapDialog.tsx`)
