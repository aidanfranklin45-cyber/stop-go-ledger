# Stop & Go Ledger - Agent Rules

## Deployment Protocol
Whenever completing a task that involves pushing changes to GitHub, you MUST follow this protocol:
1. **Analyze Syntax & Test**: Run a syntax check and any applicable tests on the codebase (e.g., `npm test` or `npm run lint`) to ensure the code is stable before pushing.
2. **Deploy Cloud Functions**: If any changes were made to the backend (i.e. inside the `functions/` directory), you MUST deploy them directly to Firebase by running `firebase deploy --only functions --project stopandgochores` in the terminal. Do not assume the GitHub Actions workflow will deploy the backend; it is currently only configured to deploy the frontend to GitHub Pages.
