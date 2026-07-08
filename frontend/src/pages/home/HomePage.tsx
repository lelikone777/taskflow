import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui';

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      return;
    }
    navigate(`/confirm-email/${encodeURIComponent(token)}`, { replace: true });
  }, [location.search, navigate]);

  return (
    <div className="container stack stack-gap-lg py-10">
      <header className="stack stack-gap-sm">
        <h1 className="text-h1">TaskFlow</h1>
        <p className="text-body">Стартовый экран с переходом на демо компонентов, виджетов и служебных страниц.</p>
      </header>

      <div className="stack stack-gap-md">
        <div className="surface surface--sm flex items-center justify-between gap-4">
          <div>
            <div className="text-h3">Dashboard</div>
            <div className="text-body-sm">Open main workspace with projects and tasks.</div>
          </div>
          <Link to="/dashboard">
            <Button variant="primary">Open dashboard</Button>
          </Link>
        </div>
        <div className="surface surface--sm flex items-center justify-between gap-4">
          <div>
            <div className="text-h3">Демо компонентов</div>
            <div className="text-body-sm">Посмотреть доступные UI-блоки.</div>
          </div>
          <Link to="/demo">
            <Button variant="outlined">Открыть компоненты</Button>
          </Link>
        </div>
        <div className="surface surface--sm flex items-center justify-between gap-4">
          <div>
            <div className="text-h3">Демо виджетов</div>
            <div className="text-body-sm">Посмотреть модалки, сайдбары и составные блоки.</div>
          </div>
          <Link to="/widgets">
            <Button variant="outlined">Открыть виджеты</Button>
          </Link>
        </div>
        <div className="surface surface--sm flex items-center justify-between gap-4">
          <div>
            <div className="text-h3">Демо служебных страниц</div>
            <div className="text-body-sm">Открыть 404, Error и Loading экраны.</div>
          </div>
          <Link to="/service-pages">
            <Button variant="outlined">Открыть служебные</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
