# Continue Core Binary

The purpose of this folder is to package Typescript code in a way that can be run from any IDE or platform. We first bundle with `esbuild` and then package into binaries with `pkg`.

The `pkgJson/package.json` contains instructions for building with pkg, and needs to be in a separte folder because there is no CLI flag for the assets option (it must be in a package.json), and pkg doesn't recognize any name other than package.json, but if we use the same package.json with dependencies in it, pkg will automatically include these, significantly increasing the binary size.

The build process is otherwise defined entirely in `build.js`.

### List of native modules

- sqlite3/build/Release/node_sqlite3.node (\*)
- @lancedb/\*\*
- esbuild?
- @esbuild?
- onnxruntime-node?

### List of dynamically imported modules

- posthog-node
- @octokit/rest
- esbuild

### List of .wasm files

- tree-sitter.wasm
- tree-sitter-wasms/

(\*) = need to download for each platform manually

## Debugging

To debug the binary with IntelliJ, set `useTcp` to `true` in `CoreMessenger.kt`, and then in VS Code run the "Core Binary" debug script. Instead of starting a subprocess for the binary and communicating over stdin/stdout, the IntelliJ extension will connect over TCP to the server started from the VS Code window. You can place breakpoints anywhere in the `core` or `binary` folders.

## Building

```bash
npm run build
```

## Testing

```bash
npm run test
```


# 以下是上述代码的翻译：

---

# Continue 核心二进制 (Core Binary)

此文件夹的目的是将 TypeScript 代码打包成可以在任何 IDE 或平台上运行的形式。我们先使用 `esbuild` 进行打包，然后用 `pkg` 将其封装成二进制文件。

`pkgJson/package.json` 包含了使用 `pkg` 构建的指令，并且需要放在一个单独的文件夹中，因为 `pkg` 没有用于 `assets` 选项的 CLI 标志（它必须写在 `package.json` 中），并且 `pkg` 只识别名为 `package.json` 的文件。然而，如果我们使用包含依赖项的相同 `package.json`，`pkg` 会自动包含这些依赖项，从而显著增加二进制文件的大小。

构建过程的其余部分完全定义在 `build.js` 文件中。

### 本地模块列表 (List of native modules)

- sqlite3/build/Release/node_sqlite3.node (\*)
- @lancedb/\*\*
- esbuild?
- @esbuild?
- onnxruntime-node?

### 动态导入的模块列表 (List of dynamically imported modules)

- posthog-node
- @octokit/rest
- esbuild

### .wasm 文件列表 (List of .wasm files)

- tree-sitter.wasm
- tree-sitter-wasms/

(\*) = 需要为每个平台手动下载

## 调试 (Debugging)

要使用 IntelliJ 调试二进制文件，请将 `CoreMessenger.kt` 中的 `useTcp` 设置为 `true`，然后在 VS Code 中运行 "Core Binary" 调试脚本。此时，IntelliJ 插件将通过 TCP 连接到从 VS Code 窗口启动的服务器，而不是启动二进制文件的子进程并通过 stdin/stdout 进行通信。您可以在 `core` 或 `binary` 文件夹中的任何位置放置断点。

## 构建 (Building)

```bash
npm run build
```

## 测试 (Testing)

```bash
npm run test
```

--- 

希望这对您有帮助！
