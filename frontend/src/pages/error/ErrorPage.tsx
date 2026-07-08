import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui';

export type ErrorPageProps = {
  title?: string;
  message?: string;
  subtitle?: string;
  onRetry?: () => void;
};

export function ErrorPage(props: ErrorPageProps) {
  const {
    title = 'Error...',
    message = 'Что-то пошло не так.',
    subtitle = 'Попробуйте позже.',
    onRetry,
  } = props;
   
  const navigate = useNavigate();
  const hasHistoryEntry = (window.history.state?.idx ?? 0) > 0;

  const handleGoBack = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    if (hasHistoryEntry) {
      navigate(-1);
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen px-8 py-15 sm:py-55 sm:px-13 md:px-24 md:py-16 bg-[url(/bg-1.jpg)] bg-cover bg-center bg-no-repeat relative overflow-x-hidden   ">
      {/* Заголовок "Error..." - на больших экранах абсолютно позиционирован и расположен сзади, на мобильных/планшетах в обычном потоке */}
      <h1 className="text-8xl mb-24 pt-34 sm:text-[200px]  flex items-center justify-center  sm:mb-30 md:text-[330px] md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-0 md:mb-0 md:pt-0 md:pl-0 md:ml-0 md:w-screen  font-regular text-(--color-brand-400) opacity-80  text-center select-none pointer-events-none leading-none">
        {title}
      </h1>

      {/* Контент (карточка и кнопка) - на больших экранах поверх "Error..." */}
      <div className="relative z-10  w-full flex flex-col items-center gap-17  sm:gap-18 md:gap-16  sm:mt-0  md:mt-35 md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2  md:-translate-y-1/2  ">
        {/* Белая карточка с сообщением об ошибке*/}
        <div className="surface py-6 px-6  w-[321px] sm:w-full sm:max-w-[583px] sm:py-11 sm:px-5  md:py-8  md:px-5  md:max-w-[550px]  text-center rounded-[20px] shadow-lg">
          <p className="text-2xl mt-0 mb-7 sm:text-[40px]  sm:mb-15 md:text-4xl md:mb-15 md:tracking-[0.06em] text-(--color-text-primary)">
            {message}
          </p>
          {subtitle && (
            <p className="text-base sm:text-2xl md:text-3xl text-(--color-text-primary)">
              {subtitle}
            </p>
          )}
        </div>

        {/* Кнопка "ВЕРНУТЬСЯ НАЗАД" */}
        <Button
          type="button"
          size="lg"
          fullWidth
          className="py-6 text-[10px] max-w-[224px]  sm:py-8 sm:px-25  sm:text-xl  sm:max-w-[408px] md:max-w-[460px] md:text-xl md:py-7 md:px-26 uppercase tracking-wide"
          onClick={handleGoBack}
        >
          Вернуться назад
        </Button>
      </div>
    </div>
  );
}

