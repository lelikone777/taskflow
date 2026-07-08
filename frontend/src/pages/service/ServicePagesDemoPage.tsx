import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { ChevronDownIcon } from '@/shared/ui/icons';

export function ServicePagesDemoPage() {
  return (
    <>
      <div className="container stack stack-gap-lg py-10">
        <header className="stack stack-gap-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-body-sm text-[color:var(--color-text-secondary)]">
            <ChevronDownIcon className="h-4 w-4 rotate-90" />
            Назад
          </Link>
          <div className="stack stack-gap-sm">
            <h1 className="text-h1">Демо служебных страниц</h1>
            <p className="text-body">Переходы на служебные экраны приложения: 404, Error и Loading.</p>
          </div>
        </header>

        <section className="stack stack-gap-md">
          <div className="surface p-4 rounded-lg border border-[color:var(--color-border)]">
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
          </div>
        </section>
      </div>
    </> // Закрываем фрагмент (<>)
  );
}
