import { Button, Checkbox, ChevronRightIcon, Divider, IconButton, Modal, Select } from '@/shared/ui';
import { Calendar } from '@/shared/ui/Calendar/Calendar';
import { useCallback, useMemo, useState } from 'react';

export type CalendarVariant = 'reminder' | 'deadline';

export type CalendarModalProps = {
    isOpen: boolean;
    onClose: () => void;
    variant?: CalendarVariant;
};

export function CalendarModal({ isOpen, onClose, variant = 'deadline' }: CalendarModalProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [isTaskScheduled, setIsTaskScheduled] = useState(false);

    const options = [
        { value: 'none', label: 'Нет' },
        { value: 'daily', label: 'Каждый день' },
        { value: 'weekly', label: 'Еженедельно' },
        { value: 'monthly', label: 'Ежемесячно' },
        { value: 'weekdays', label: 'Пн-Пт' },
    ];

    const handleClose = () => onClose();

    const handleSubmit = useCallback(() => {
        onClose();
    }, [onClose]);

        

    const canSave = useMemo(() => {
        return Boolean(selectedDate);
    }, [selectedDate]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            showClose={false}
            className="h-auto w-full max-w-[580px] max-sm:fixed max-sm:h-full max-sm:rounded-none p-[10px]"
        >
            {/* Скрыт на компе */}
            <div className="flex flex-row justify-start items-center gap-[4px] p-[8px_8px_16px] sm:hidden">
                <IconButton
                    variant="outlined"
                    size="sm"
                    aria-label="Назад"
                    onClick={handleClose}
                    className="border-none"
                >
                    <ChevronRightIcon width="100%" height="100%" stroke="#4e8ee3" className="[transform:scaleX(-1)]" />
                </IconButton>
                <h2 className="text-h2 text-neutral-950">Календарь</h2>
            </div>

            <div className="max-h-[80vh] overflow-x-hidden overflow-y-auto max-sm:overflow-y-auto max-sm:overflow-x-hidden">
                {/* Календарь напоминание*/}
                {variant === 'reminder' && (
                    <div className="p-[70px_60px_0] max-sm:p-[8px_0_0]">
                        <Calendar
                            showTimeBlock={true}
                            onDateSelect={setSelectedDate}
                        />

                        <div className="flex flex-col gap-[28px] max-sm:gap-[24px] mb-[16px] max-sm:mb-[12px]">
                            <div className="flex flex-row items-center justify-between">
                                <span
                                    className="text-h2 max-sm:text-5 text-neutral-800"
                                    style={{ fontWeight: '500' }}
                                >
                                    Повторы
                                </span>
                                <Select size="lg" className="w-[200px]">
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value} className="">
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <Divider />
                        </div>
                    </div>
                )}

                {/* Календарь дедайн*/}
                {variant === 'deadline' && (
                    <div className="p-[50px_60px_0] max-sm:p-[8px_0_0]">
                        <Calendar
                            title="Сделать задачу до"
                            showTimeBlock={true}
                            onDateSelect={setSelectedDate}
                        />
                        <div className="flex mb-10">
                            <Checkbox
                                checked={isTaskScheduled}
                                onChange={(e) => setIsTaskScheduled(e.target.checked)}
                                style={{  display: 'flex', gap: '2px', alignItems: 'center' }}
                                label={
                                    <span className="text-neutral-800 text-[16px] sm:text-[18px] font-medium leading-none">
                                        Запланировать задачу 
                                    </span>
                                }
                            />
                        </div> 
                        
                        {isTaskScheduled && (
                            <div className="flex flex-col gap-10 mb-10">
                                <Calendar
                                    title="Начало задачи"
                                    showTimeBlock={false}
                                    onDateSelect={setSelectedDate}
                                />
                                <Divider />
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* кнопки внизу */}
            <div className="flex flex-row max-sm:flex-col gap-7 w-full sticky top-0 sticky bottom-0 px-[60px] pb-[50px] max-sm:px-2 max-sm:pb-[11px]">
                <Button
                    fullWidth={true}
                    size="lg"
                    variant="tonal"
                    onClick={handleSubmit}
                    disabled={!canSave}
                    className="bg-brand-100 text-brand-600 font-medium text-[16px]"
                >
                    Сохранить
                </Button>
                <Button
                    fullWidth={true}
                    size="lg"
                    onClick={handleClose}
                    className="max-sm:hidden bg-neutral-150 text-neutral-800 font-medium text-[16px]"
                >
                    Отменить
                </Button>
            </div>
        </Modal>
    )
}

