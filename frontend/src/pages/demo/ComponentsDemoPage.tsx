import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Avatar,
  AuthButton,
  Badge,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Input,
  Progress,
  Radio,
  Select,
  Tabs,
  Tag,
  Toggle,
  FilterIcon,
  ChevronDownIcon,
  SearchIcon,
  CalendarIcon,
  ClockIcon,
  PaperclipIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  ChevronLeftIcon,
  ArhivIcon,
  DataProjectIcon,
  TasksListIcon,
  RecoverIcon,
  SortIcon,
} from '@/shared/ui';
import { ProjectToolbar } from '@/widgets/ProjectToolbar';
import { CalendarModal, ChangePasswordModal, ConfirmExitModal, UploadAvatarModal } from '@/widgets/modals';
import { EditMenuIcon } from '@/shared/ui/icons/EditMenuIcon';

export function ComponentsDemoPage() {
  const [tab, setTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCalendarReminder, setShowCalendarReminder] = useState(false);
  const [showCalendarDeadline, setShowCalendarDeadline] = useState(false);

  return (
    <div className="container stack stack-gap-lg py-10">
      <header className="stack stack-gap-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-body-sm text-[color:var(--color-text-secondary)]">
          <ChevronDownIcon className="h-4 w-4 rotate-90" />
          Назад
        </Link>
        <div className="stack stack-gap-sm">
          <h1 className="text-h1">Демо компонентов</h1>
          <p className="text-body">Все переиспользуемые UI‑блоки в одном месте.</p>
        </div>
      </header>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Toolbar</h2>
        <ProjectToolbar searchValue={search} onSearchChange={setSearch} />
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Основная</Button>
          <Button variant="tonal">Тональная</Button>
          <Button variant="outlined">Контурная</Button>
          <Button variant="link">Ссылка</Button>
          <Button size="sm">Маленькая</Button>
          <Button size="lg">Большая</Button>
          <IconButton variant="outlined" aria-label="Фильтры">
            <FilterIcon className="h-4 w-4" />
          </IconButton>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">AuthButtons</h2>
        <div className="stack stack-gap-sm">
          <div className="grid grid--2 grid-gap-md">
            <AuthButton
              provider="google"
              fullWidth
            />
            <AuthButton
              provider="gitlab"
              fullWidth
            />
          </div> 
          </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Inputs</h2>
        <div className="grid grid--2 grid-gap-md">
          <Input placeholder="Поиск проекта" rightSlot={<SearchIcon className="h-4 w-4" />} />
          <Input placeholder="С ошибкой" hasError />
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Badges</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="neutral">Нейтральный</Badge>
          <Badge color="info">Инфо</Badge>
          <Badge color="success">Успех</Badge>
          <Badge color="warning">Внимание</Badge>
          <Badge color="danger">Ошибка</Badge>
          <Badge color="low">Низкий</Badge>
          <Badge color="medium">Средний</Badge>
          <Badge color="high">Высокий</Badge>
          <Badge color="critical">Критичный</Badge>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Select</h2>
        <div className="grid grid--2 grid-gap-md">
          <Select defaultValue="">
            <option value="" disabled>
              Выберите статус
            </option>
            <option value="planned">Запланирована</option>
            <option value="in-progress">В работе</option>
            <option value="done">Завершена</option>
          </Select>
          <Select defaultValue="in-progress" disabled helperText="Недоступно">
            <option value="planned">Запланирована</option>
            <option value="in-progress">В работе</option>
            <option value="done">Завершена</option>
          </Select>
          <Select defaultValue="planned" errorText="Поле обязательно">
            <option value="planned">Запланирована</option>
            <option value="in-progress">В работе</option>
            <option value="done">Завершена</option>
          </Select>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Выбор</h2>
        <div className="flex flex-wrap items-center gap-6">
          <Checkbox label="Checkbox" defaultChecked />
          <Radio name="demo" label="Radio" defaultChecked />
          <Toggle label="Toggle" defaultChecked />
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Tabs</h2>
        <Tabs
          items={[
            { value: 'tasks', label: 'Задачи' },
            { value: 'flow', label: 'Поток' },
            { value: 'notes', label: 'Заметки', disabled: true },
          ]}
          value={tab}
          onChange={setTab}
        />
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Progress</h2>
        <div className="stack stack-gap-sm">
          <Progress value={20} color="brand" />
          <Progress value={45} color="success" />
          <Progress value={70} color="warning" />
          <Progress value={90} color="danger" />
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Avatars</h2>
        <div className="flex items-center gap-4">
          <Avatar size="md" fallback="JB" />
          <Avatar size="sm" fallback="TF" />
          <Avatar size="xs" fallback="A" />
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Divider</h2>
        <Divider label="ИЛИ" />
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Tags</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>Обычный</Tag>
          <Tag active>Активный</Tag>
          <Tag onRemove={() => {}}>С удалением</Tag>
          <Tag disabled>Отключён</Tag>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Модальные окна</h2>
        <div className="surface p-4 flex flex-wrap items-center gap-3 text-body-sm">
          <span className="text-[color:var(--color-text-secondary)]">Демо модальных окон:</span>
          <Button type="button" size="sm" onClick={() => setShowChangePassword(true)}>
            Сменить пароль
          </Button>
          <Button type="button" size="sm" variant="outlined" onClick={() => setShowUpload(true)}>
            Добавить фото
          </Button>
          <Button type="button" size="sm" variant="outlined" onClick={() => setShowExit(true)}>
            Выйти
          </Button>
          <Link to="/profile">
            <Button type="button" size="sm" variant="outlined">
              Открыть профиль
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outlined" onClick={() => setShowCalendarReminder(true)}>
            Календарь (напоминание)
          </Button>
          <Button type="button" size="sm" variant="outlined" onClick={() => setShowCalendarDeadline(true)}>
            Календарь (дедайн)
          </Button>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Служебные страницы</h2>
        <div className="stack stack-gap-lg">
          <div className="stack stack-gap-sm">
            <h3 className="text-h3">404 - Страница не найдена</h3>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Полноэкранная страница с градиентным фоном, большим "404" и кнопкой возврата.
            </p>
            <div className="surface p-4 rounded-lg border border-[color:var(--color-border)]">
              <div className="flex flex-wrap gap-3">
                <Link to="/some-nonexistent-page">
                  <Button variant="outlined" size="sm">
                    Перейти на несуществующую страницу (404)
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="stack stack-gap-sm">
            <h3 className="text-h3">Error - Страница ошибки</h3>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Полноэкранная страница с сообщением об ошибке и кнопкой возврата.
            </p>
            <div className="surface p-4 rounded-lg border border-[color:var(--color-border)]">
              <div className="flex flex-wrap gap-3">
                <Link to="/error">
                  <Button variant="outlined" size="sm">
                    Открыть страницу ошибки
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="stack stack-gap-sm">
            <h3 className="text-h3">Loading - Страница загрузки</h3>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Полноэкранная страница с сообщением о загрузке и прогресс-баром.
            </p>
            <div className="surface p-4 rounded-lg border border-[color:var(--color-border)]">
              <div className="flex flex-wrap gap-3">
                <Link to="/loading">
                  <Button variant="outlined" size="sm">
                    Открыть страницу загрузки
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stack stack-gap-md">
        <h2 className="text-h2">Icons</h2>
        <div className="flex flex-wrap items-center gap-2">
        <CalendarIcon>Календарь</CalendarIcon>
        <ClockIcon>Часы</ClockIcon>
        <PaperclipIcon>Скрепка</PaperclipIcon>
        <DeleteIcon>Удалить</DeleteIcon>
        <EditIcon>Редактировать</EditIcon>
        <CheckIcon>Выполнено</CheckIcon>
        <ChevronLeftIcon>Стрелка влево</ChevronLeftIcon>
        <ArhivIcon>Архив</ArhivIcon>
        <DataProjectIcon>Дата начала и окончания проекта</DataProjectIcon>
        <TasksListIcon>Список задач</TasksListIcon>
        <RecoverIcon>Восстановление</RecoverIcon>
        <SortIcon>Сортировка</SortIcon>
        <EditMenuIcon>Редактировать</EditMenuIcon>
        

        

        </div>
      </section>

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <ConfirmExitModal isOpen={showExit} onClose={() => setShowExit(false)} />
      <UploadAvatarModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
      <CalendarModal variant='reminder' isOpen={showCalendarReminder} onClose={() => setShowCalendarReminder(false)} />
      <CalendarModal variant='deadline' isOpen={showCalendarDeadline} onClose={() => setShowCalendarDeadline(false)} />
    </div>
  );
}
