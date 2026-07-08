import { useEffect, useState } from 'react';

import { Progress } from '@/shared/ui';

export type LoadingPageProps = {
    message?: string;
    showProgress?: boolean;
    progressValue?: number;
};

export function LoadingPage({
    message = 'Загружаем данные...',
    showProgress = true,
    progressValue,
}: LoadingPageProps = {}) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (showProgress && progressValue === undefined) {
            // Симуляция прогресса, если значение не передано
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        return prev; // Останавливаемся на 90%, показываем что идет загрузка
                    }
                    return prev + Math.random() * 10;
                });
            }, 300);

            return () => clearInterval(interval);
        }
    }, [showProgress, progressValue]);

    const displayProgress = progressValue !== undefined ? progressValue : progress;

    return (
        <div className="min-h-screen px-1 py-40 bg-[url(/bg.jpg)] bg-cover bg-center bg-no-repeat flex flex-col justify-center
         items-start  sm:px-5 sm:py-32">
            {/* Белая карточка с сообщением */}
            <div className="surface py-1 px-0 w-[171px] mb-5 sm:py-2 sm:mb-6 sm:w-full  sm:max-w-[381px] md:py-1 md:px-10  md:mb-7 md:max-w-[322px] text-center rounded-[20px] shadow-lg">
                <p className="text-xs sm:text-base md:text-base  text-center  text-(--color-text-primary)">
                    {message}
                </p>
            </div>

            {/* Прогресс-бар */}
            {showProgress && (
                <div className="w-full max-w-none">
                    <Progress value={displayProgress} color="brand" className="h-2 sm:h-5" />
                </div>
            )}
        </div>
    );
}

