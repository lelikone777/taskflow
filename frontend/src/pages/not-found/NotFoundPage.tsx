import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui';

export function NotFoundPage() {
  const navigate = useNavigate();
  const hasHistoryEntry = (window.history.state?.idx ?? 0) > 0;

  const handleGoBack = () => {
    if (hasHistoryEntry) {
      navigate(-1);
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="relative min-h-screen  bg-[url(/bg-1.jpg)] bg-cover bg-center bg-no-repeat   py-15 px-4  sm:pt-60 sm:px-15  md:pt-53 md:px-0 lg:pt-53 lg:px-0 overflow-x-hidden ">
      {/* "404" - на больших экранах абсолютно позиционирован сзади */}
      <div className=" mb-0 md:mb-12 lg:mb-0  flex items-center justify-center  pointer-events-none  md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                md:w-full md:z-0 ">
        <div className="text-[120px] xs:text-[150px] sm:text-[400px] md:text-[500px] lg:text-[600px]  flex items-center justify-center  font-regular text-center leading-none select-none">
          <span className="text-(--color-brand-400) opacity-60">4</span>
          <span className="inline-block mx-1 sm:mx-0 md:mx-0 lg:mx-0">
            <span className="relative inline-block w-[121px] h-[181px] sm:w-[210px] sm:h-[316px] md:w-[314px] md:h-[472px] sm:translate-y-5 md:translate-y-[30px] ">
              {/* Градиентный овал для "0" */}
              {/* Внешний слой */}
              <span
                className="absolute inset-0 opacity-100 blur-sm"
                style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(35.31deg, #ECF7FF 30.21%, rgba(111, 174, 235, 0.8) 78.39%)',
                  clipPath: 'ellipse(50% 45% at 50% 50%)',
                }}
              />
              {/* Средний слой */}
              <span
                className="absolute inset-px opacity-60 blur-sm"
                style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(35.31deg, #ECF7FF 30.21%, rgba(111, 174, 235, 0.8) 78.39%)',
                  clipPath: 'ellipse(48% 43% at 50% 50%)',
                }}
              />
              {/* Внутренний слой*/}
              <span
                className="absolute inset-[3px] opacity-80"
                style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(35.31deg, #ECF7FF 30.21%, rgba(111, 174, 235, 0.8) 78.39%)',
                  clipPath: 'ellipse(45% 40% at 50% 50%)',
                }}
              />
              {/* Центральное свечение */}
              <span
                className="absolute inset-2 opacity-90"
                style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(35.31deg, #ECF7FF 30.21%, rgba(111, 174, 235, 0.8) 78.39%)',
                  clipPath: 'ellipse(35% 30% at 50% 50%)',
                }}
              />
            </span>
          </span>
          <span className="text-(--color-brand-400) opacity-60">4</span>
        </div>
      </div>

      {/* Контент (карточка и кнопка) - на больших экранах поверх "404" */}
      <div className="relative z-10 flex flex-col items-center  gap-11 mt-15 sm:mt-10 sm:gap-16 md:gap-18 md:mt-20  md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10  w-full">
        {/* Белая карточка с текстом */}
        <div className="surface w-full  py-11 px-5 sm:py-15 sm:px-10 md:py-18 md:px-6 lg:py-18 lg:px-10 sm:max-w-[583px] md:max-w-[650px]  lg:max-w-[900px]  text-center rounded-[20px] shadow-lg">
          <h1 className="text-2xl mb-7 sm:text-4xl sm:mb-17 md:text-[44px] md:mb-15 lg:text-6xl lg:mb-20 sm:tracking-[0.06em] md:tracking-[0.01em] text-(--color-text-primary)">
            Страница не найдена.
          </h1>
          <p className="text-base sm:text-2xl md:text-[28px]  lg:text-4xl sm:tracking-[0.04em] md:tracking-[0.01em] text-(--color-text-primary)">
            Возможно, эта задача уже выполнена!
          </p>
        </div>

        {/* Кнопка "ВЕРНУТЬСЯ НАЗАД" */}
        <Button
          type="button"
          size="lg"
          fullWidth
          className="py-6 px-14 text-[10px] max-w-[224px] sm:py-8 sm:px-25 sm:text-xl sm:max-w-[408px] md:max-w-[460px] md:text-2xl  md:py-9 md:px-25 lg:max-w-[600px]  lg:text-3xl lg:py-10 lg:px-30 uppercase tracking-wide"
          onClick={handleGoBack}
        >
          Вернуться назад
        </Button>
      </div>
    </div>
  );
}
