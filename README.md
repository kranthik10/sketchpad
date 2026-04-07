# 🎨 Sketchpad

Sketchpad is a real-time collaborative drawing application built with React, Vite, and Yjs.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Project target: v22+)
- [npm](https://www.npmjs.com/) (Standard for dependency management)

### Local Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/kranthik10/sketchpad.git
    cd sketchpad
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment**:
    Copy the example environment file and adjust variables as needed:
    ```bash
    cp .env.example .env
    ```

    By default, the collaboration server runs on port `8787`. You can change this in your `.env` file:
    - `PORT`: Set this to your desired server port (default: 8787).
    - `FRONTEND_ORIGIN`: Ensure this matches your Vite dev server address (default: http://localhost:5173).
    

4.  **Start development server**:
    This will concurrently start the Vite frontend and the Node.js collaboration server.
    ```bash
    npm run dev
    ```

### Running with Docker

We provide a production-ready, multi-stage Docker build for easy deployment.

1.  **Build the image**:
    ```bash
    docker build -t sketchpad .
    ```

2.  **Run the container**:
    ```bash
    docker run -p 8787:8787 sketchpad
    ```

## 🤝 Collaborative Features

Sketchpad includes robust real-time collaboration:
- **Live Cursors**: See where others are working with color-coded labels.
- **Dynamic Previews**: View immediate "ghost" drafts of elements being drawn.
- **Session Management**: Start and stop collaboration sessions securely.
- **Auto-Identity**: Join sessions instantly as a guest, then update your profile.

## 🧪 Testing and Quality

We maintain high code quality with automated tools:

- **Run unit tests**: `npm test`
- **One-time test run**: `npm run test:run`
- **Type Checking**: `npx tsc --noEmit`

## 🛠 Contributing

We welcome contributions! Please follow these steps to contribute:

1.  **Create a branch**: `git checkout -b feature/your-feature-name`
2.  **Implement your changes**: Follow the project's design system and coding standards.
3.  **Validate locally**: Ensure your code passes all tests and type checks.
4.  **Commit with clarity**: Use descriptive commit messages following professional standards.
5.  **Submit a Pull Request**: Follow the PR guidelines below.

## ✅ Pull Request Requirements

Before submitting your PR, ensure the following checklist is completed:

- [ ] **Tests Passing**: Run `npm run test:run` and verify all tests are green.
- [ ] **Type Integrity**: Run `npx tsc --noEmit` to ensure zero TypeScript errors.
- [ ] **Formatting**: Code should adhere to the project's formatting standards.
- [ ] **Documentation**: Update relevant README sections if your PR adds new features or changes existing setup steps.
- [ ] **No Emojis**: Avoid using emojis in code, comments, or commit messages (per user policy).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
