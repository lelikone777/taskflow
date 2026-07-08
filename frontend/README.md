# TaskFlow

Полнофункциональный таск-трекер с проектами, списками задач, подзадачами и напоминаниями. Проект разделен на backend и frontend, рассчитан на практику командной разработки и демонстрацию навыков работы через API, с очередями и хранилищем файлов.

## Цель проекта

- Создать личный таск-трекер с проектами, задачами и подзадачами
- Реализовать авторизацию, напоминания, вложения, фильтры и поиск
- Показать полный цикл разработки: окружение -> API -> фронт -> интеграция -> тесты -> документация

## Ссылки

- [Техническое задание](https://docs.google.com/document/d/1izlsoCyDkHfx6aIstXH8drE8Wlw1pY11/edit)
- [Макет в Figma](https://www.figma.com/design/HlDqzktwjQv6gyL5HdjP5s/TaskFlow)

## Стек

### Frontend

- React + TypeScript
- Redux Toolkit
- TanStack React Query
- React-Hook-Form + Zod (+ zod-resolver)
- Tailwind CSS
- Axios
- Vite

### Тесты

- Vitest + React Testing Library

## Локальный запуск

```bash
npm install
npm run dev
```

Frontend доступен на `http://127.0.0.1:5173` и проксирует `/api` в backend,
адрес которого задаётся через `VITE_API_PROXY_TARGET`.

Полный backend-стек запускается из отдельного репозитория `backend`:

```bash
docker compose up --build -d
```

Основные проверки frontend:

```bash
npm test
npm run lint
npm run build
```

## Состав команды

| Роль | Имя | Контакт |
| --- | --- | --- |
| PM | Элина | @Bakaeva_Elina |
| Teamlead design | Лидия | @Lida |
| Designer | Александра | @aefremova |
| Designer | Алексей | @alexey_bulanov |
| Designer | Анастасия | @Nastasia |
| Teamlead Backend Developer | Олег | @omiskhozhev |
| Backend Developer | Мария | @Mariya_G |
| Backend Developer | Валерий | @Valeriy |
| Teamlead Frontend Developer | Алексей | @Aleks686 |
| Frontend Developer | Анна | @AnnaGorbacheva |
