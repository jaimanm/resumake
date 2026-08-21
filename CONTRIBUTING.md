# Contributing Guidelines

First off, thanks for taking the time to contribute!

All types of contributions are encouraged and valued. See the Table of Contents for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved.

## Development Workflow

We strictly adhere to a Git Flow process. **Direct pushes to the `main` branch are strictly prohibited**, even for repository administrators and AI assistants.

To contribute, you must follow these exact steps:

1. **Create an Issue:**
   Before writing code, create an issue describing the bug you intend to fix or the feature you intend to build.

2. **Branch off from `main`:**
   Use a semantic naming convention for your branch:
   - `feat/description` for new features
   - `fix/description` for bug fixes
   - `chore/description` for non-functional tasks (docs, CI/CD, etc.)

3. **Write Tests:**
   If you are contributing to the Node.js CLI logic in `src-cli`, ensure that your logic is fully covered by Jest tests in `src-cli/tests/index.test.js`. Execute `npm test` inside `src-cli` to verify.

4. **Submit a Pull Request:**
   Push your branch and open a Pull Request against `main`. Ensure your PR description links back to the issue it resolves (e.g., "Closes #5").

5. **Wait for CI / Review:**
   The `main` branch is protected. All GitHub Action status checks (such as the `test` workflow) must pass before a merge is permitted.

By following these guidelines, we ensure that the `main` branch remains perfectly stable for end-users relying on our CLI tool!
