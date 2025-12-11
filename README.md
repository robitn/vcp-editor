# VCP Editor

VCP Editor is a cross-platform desktop application for visually designing, editing, and managing Virtual Control Panels (VCPs) specifically for the Centroid CNC Acorn system. It provides a graphical interface to create, configure, and preview button layouts, grid arrangements, and control logic for Acorn VCPs, supporting both rapid prototyping and production deployment. Built with Tauri, React, and TypeScript, VCP Editor combines a modern user experience with native performance and deep integration for both front-end and Rust-based back-end logic.

---

# Tauri + React + Typescript

VCP Editor is built using Tauri, React, and TypeScript, leveraging the strengths of each technology to deliver a powerful and efficient application. Tauri enables the creation of small, fast binaries for the back end, while React and TypeScript provide a robust framework for building the user interface.

## Tauri

Tauri is a framework for building native applications with web technologies. It allows developers to create small, fast binaries for the back end of their applications, using Rust programming language. Tauri takes care of the native build process, enabling developers to focus on building their application.

## React

React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components, manage application state, and handle user interactions. React's declarative approach makes it easy to understand and reason about the application UI.

## TypeScript

TypeScript is a superset of JavaScript that adds static typing to the language. It helps developers catch errors at compile time, rather than at runtime, and provides a better development experience with features like autocompletion and type checking. TypeScript code is transpiled to JavaScript, ensuring compatibility with all modern web browsers.

---

# Getting Started

To get started with VCP Editor, follow these steps:

1. Install the latest version of Node.js (which includes npm) from [Node.js official website](https://nodejs.org/).
2. Install Rust programming language by following the instructions at [Rust official website](https://www.rust-lang.org/tools/install).
3. Clone the VCP Editor repository from GitHub:
   ```bash
   git clone https://github.com/robitn/vcp-editor.git
   ```
4. Navigate to the project directory:
   ```bash
   cd vcp-editor
   ```
5. Install the required dependencies:
   ```bash
   npm install
   ```
6. Run the development server:
   ```bash
   npm run tauri dev
   ```

For detailed documentation on using VCP Editor, please refer to the [VCP Editor Documentation](https://github.com/robitn/vcp-editor/docs).

---

# Contributing

Contributions to VCP Editor are welcome! If you would like to contribute, please follow these steps:

1. Fork the repository on GitHub.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b my-feature-branch
   ```
3. Make your changes and commit them with a descriptive message:
   ```bash
   git commit -m "Add my new feature"
   ```
4. Push your changes to your forked repository:
   ```bash
   git push origin my-feature-branch
   ```
5. Submit a pull request to the main repository.

Please make sure to follow the existing code style and conventions when contributing to the project. Additionally, ensure that your code is well-tested and does not break any existing functionality.

---

# License

VCP Editor is licensed under the MIT License. See the [LICENSE](https://github.com/robitn/vcp-editor/LICENSE) file for more information.

---

# Acknowledgements

- [Tauri](https://tauri.studio/) - For providing the framework to build the native application.
- [React](https://reactjs.org/) - For the powerful JavaScript library to build the user interface.
- [TypeScript](https://www.typescriptlang.org/) - For adding static typing to JavaScript, improving developer experience.
- [Rust](https://www.rust-lang.org/) - For the systems programming language that runs fast, prevents segfaults, and guarantees thread safety.
- [Node.js](https://nodejs.org/) - For the JavaScript runtime built on Chrome's V8 JavaScript engine.
- [npm](https://www.npmjs.com/) - For the package manager for JavaScript, included with Node.js.

---

## Attribution

- [Font Awesome](https://fontawesome.com/) icons are used under the [Creative Commons Attribution 4.0 International license (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/).

---

# Support

For support, please open an issue on the [VCP Editor GitHub repository](https://github.com/robitn/vcp-editor/issues). I will try to respond to your query in my own good time.

