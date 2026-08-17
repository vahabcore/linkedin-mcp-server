# Contributing to LinkedIn MCP Server

Thank you for your interest in contributing to the LinkedIn Model Context Protocol (MCP) Server! We welcome bug reports, feature suggestions, and code contributions.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/linkedin-mcp-server.git
   cd linkedin-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in your LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Pull Request Guidelines

1. Ensure all tests pass before submitting (`npm test`).
2. Add new unit and integration tests for any new tools or helper methods in `tests/`.
3. Follow idiomatic ES Module JavaScript conventions.
4. Keep tools modular: each MCP tool should live in `src/tools/<toolName>.js` and export a `register(server)` function.
