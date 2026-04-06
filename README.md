# Sketchpad

A premium React + Vite project designed with security and scalability in mind.

## Security Features

- **Strict `.gitignore`**: All environment variables and sensitive files are excluded from version control.
- **Environment Management**: Use `.env.example` to manage environment-specific configurations without compromising secrets.
- **Node Modules Protection**: Standard node_modules exclusion and package-lock.json for consistent dependency management.

## Environment Variables

Copy `.env.example` to `.env` to configure your development variables.

```bash
cp .env.example .env
```

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **Run tests**:
    ```bash
    npm test
    ```

## Development and Deployment

- **Build**: Use `npm run build` for a production-ready bundle.
- **Preview**: Use `npm run preview` to locally test the production bundle.
- **Continuous Integration**: Ensure environment variables are managed securely within your CI/CD pipelines.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
