# Contributing to WinNest

First off, thank you for considering contributing to WinNest! It's people like you who make open-source software such a fantastic environment.

Here is a set of guidelines to help you contribute effectively to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Requests](#pull-requests)
3. [Development Setup](#development-setup)
   - [Prerequisites](#prerequisites)
   - [Local Environment Setup](#local-environment-setup)
   - [Building and Checking Code](#building-and-checking-code)
4. [Style Guide & Conventions](#style-guide--conventions)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [lhqminh.dev@gmail.com](mailto:lhqminh.dev@gmail.com).

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report, please check the existing issues to see if it has already been reported. When reporting a bug, please use the **Bug Report** template and include:
*   A clear and descriptive title.
*   Steps to reproduce the issue.
*   The version of WinNest, Node.js, and Wine you are using.
*   Your Linux distribution and Desktop Environment.
*   Relevant logs (you can find these in `~/.local/share/winnest/apps/<app-id>/` or by running the command with debug output).

### Suggesting Enhancements

If you have ideas to make WinNest better, feel free to open an issue using the **Feature Request** template. Please:
*   Explain the behavior you would like to see and why it is useful.
*   Provide examples of how it would work.
*   Mention alternative solutions if any.

### Pull Requests

Please follow these steps when submitting a Pull Request (PR):
1.  Fork the repository and create your branch from `main`.
2.  Name your branch descriptively: `feature/your-feature` or `bugfix/your-fix`.
3.  If you've added code that should be tested, add appropriate tests.
4.  Ensure that the TypeScript compiler checks pass (`npm run check`) and the build succeeds (`npm run build`).
5.  Make sure your commit messages are clear and follow standard practices.
6.  Open a PR against the `main` branch, filling out the PR description template.

---

## Development Setup

### Prerequisites

*   **Node.js**: Version 20 or higher is required.
*   **npm**: Installed with Node.js.
*   **Wine**: Installed on your system (e.g., `wine`, `wine64`).

### Local Environment Setup

1.  Fork the repository on GitHub.
2.  Clone your fork locally:
    ```bash
    git clone git@github.com:<your-username>/WinNest.git
    cd WinNest
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

### Building and Checking Code

We use TypeScript for our source files. Before submitting any changes, make sure to compile and type-check:

```bash
# Type check the source files without generating output
npm run check

# Build the project
npm run build
```

The compiled JS files will be generated in the `dist` directory.

---

## Style Guide & Conventions

*   **TypeScript-Only**: Keep the project logic purely TypeScript/JavaScript.
*   **No Shell Exploits**: Always spawn external commands (like `wine` or `wineserver`) with argument arrays instead of raw shell strings to prevent shell-injection vulnerabilities.
*   **Modularity**: Keep the core logic separate from any prospective GUI (e.g., Electron). The core CLI/API is the foundation and should be easily callable via Node.js APIs or IPC.
