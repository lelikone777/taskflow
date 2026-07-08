# TaskFlow Email Templates (Frontend -> Backend)

Документ фиксирует текущие React Email шаблоны и контракт переменных для backend.

## Где лежат шаблоны

- Базовый каркас: `src/emails/EmailTemplate.tsx`
- Подтверждение регистрации: `src/emails/WelcomeEmail.tsx`
- Восстановление пароля: `src/emails/PasswordRecoveryEmail.tsx`
- Напоминание о дедлайне: `src/emails/DeadlineEmail.tsx`
- Контракт и рендер HTML: `src/emails/contracts.tsx`
- Тексты и заголовки: `src/emails/config/email.config.ts`

## Контракт переменных

### Registration email (`WelcomeEmail`)
- `confirmation_url: string`

### Password recovery email (`PasswordRecoveryEmail`)
- `reset_url: string`

### Reminder email (`DeadlineEmail`)
- `task_title: string`
- `task_description: string`
- `task_url?: string` (рекомендуется передавать для быстрого перехода пользователя к задаче)

`task_url` добавлен как опциональный для обратной совместимости: если не передавать, письмо рендерится без CTA-ссылки.

## Экспорт HTML для backend

Для отдачи backend-команде статических HTML:

1. `npm run email:export`
2. Забрать сгенерированные файлы из `src/emails/dist/`

## Рекомендация по deep-link reminder email

Для перехода из письма сразу в нужную задачу предпочтительнее передавать уже готовый frontend URL в `task_url`.

Пример:
- `https://<frontend-host>/task/123`
- или `https://<frontend-host>/project/77?taskId=123`

Если backend формирует URL с query-токеном, рекомендуется явно маркировать flow как reminder/deeplink, чтобы не смешивать его с auth-flow.
