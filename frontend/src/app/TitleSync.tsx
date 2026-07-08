import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Array<{ match: (path: string) => boolean; label: string }> = [
  { match: (path) => path === '/', label: 'Главная' },
  { match: (path) => path.startsWith('/demo'), label: 'Демо' },
  { match: (path) => path.startsWith('/widgets'), label: 'Виджеты' },
  { match: (path) => path.startsWith('/service-pages'), label: 'Служебные страницы' },
  { match: (path) => path.startsWith('/login'), label: 'Вход' },
  { match: (path) => path.startsWith('/register'), label: 'Регистрация' },
  { match: (path) => path.startsWith('/forgot-password'), label: 'Восстановление пароля' },
  { match: (path) => path.startsWith('/confirm-email'), label: 'Подтверждение email' },
  { match: (path) => path.startsWith('/reset-password'), label: 'Сброс пароля' },
  { match: (path) => path.startsWith('/dashboard'), label: 'Дашборд' },
  { match: (path) => path.startsWith('/flow'), label: 'Режим Flow' },
  { match: (path) => path.startsWith('/project'), label: 'Проект' },
  { match: (path) => path.startsWith('/task'), label: 'Задача' },
  { match: (path) => path.startsWith('/profile'), label: 'Профиль' },
  { match: (path) => path.startsWith('/404'), label: 'Страница не найдена' },
];

export function TitleSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const matched = titles.find((item) => item.match(pathname));
    const pageTitle = matched ? matched.label : 'Страница не найдена';
    document.title = `TaskFlow | ${pageTitle}`;
  }, [pathname]);

  return null;
}
