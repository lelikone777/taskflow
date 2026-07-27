# TaskFlow

TaskFlow is a commercial task-management product developed by the PointPulse team. It includes projects, tasks, subtasks, Kanban workflows, authentication, attachments, reminders, filters, and search.

This repository is a public code snapshot prepared to demonstrate the product architecture and my frontend work. Day-to-day development, merge requests, and the original commit history remain in the team's private GitLab. For that reason, GitHub shows a single import commit.

## My role

I worked as a frontend developer:

- implemented and improved React and TypeScript user flows;
- integrated forms and server state with the backend API;
- verified API contracts through OpenAPI/Swagger;
- handled loading, error, empty, and authorization states;
- fixed UI and integration defects before release;
- worked with the existing codebase and team Git process.

## Frontend stack

- React 19 and TypeScript
- Vite and Tailwind CSS
- Redux Toolkit and TanStack React Query
- React Hook Form and Zod
- Axios and OpenAPI/Swagger
- Vitest and React Testing Library

## Repository structure

- `frontend/` - the application area relevant to my role;
- `backend/` - backend snapshot included for integration context;
- `design/` - product design materials;
- `gitlab-profile/` - exported GitLab activity context.

The repository does not contain a public production environment. Screenshots and a detailed case study are available in the [portfolio](https://lelikone777.github.io/projects/project-taskflow/).

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`. The backend API address can be configured with `VITE_API_PROXY_TARGET`.

## Checks

```bash
cd frontend
npm test
npm run lint
npm run build
```
