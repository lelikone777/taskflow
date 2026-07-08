import { useEffect, useMemo, useRef, useState, type DragEvent, type ChangeEvent, useCallback } from 'react';

import { formatAttachmentFileSize } from '@/entities/task';
import { Button, Modal, Spinner } from '@/shared/ui';
import { PaperclipIcon, PlusIcon, DeleteIcon } from '@/shared/ui/icons';

//Пропсы модалки для загрузки файлов
type DownloadFilesModalProps = {
  //Флаг открытия модалки
  isOpen: boolean;
  //Функция закрытия модалки
  onClose: () => void;
  // Передача файлов наружу
  onSubmit: (files: File[]) => void;
};
 //Тип файла для загрузки
type UiFile = {
  id: string;
  name: string;
  size: number;
  file: File;
};
 //Максимальный размер файла для загрузки
const MAX_FILE_SIZE_MB = 1000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
//Сама модалка для загрузки файлов
export function DownloadFilesModal({ isOpen, onClose, onSubmit }: DownloadFilesModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
   
  //Массив загруженных файлов
  const [files, setFiles] = useState<UiFile[]>([]);
  //Флаг перетаскивания файлов
  const [isDragOver, setIsDragOver] = useState(false);
  // UI-фаза для соответствия макету: "Сохранить" становится синей только после завершения загрузки файлов
  const [phase, setPhase] = useState<'empty' | 'processing' | 'ready'>('empty');
  //Прогресс загрузки файлов
  const [progress, setProgress] = useState(0);
  //Флаг открытия модалки с ошибкой размера файла
  const [isSizeErrorOpen, setIsSizeErrorOpen] = useState(false);
  //Таймер индикации прогресса
  const progressTimerRef = useRef<number | null>(null);
  //Флаг загрузки файлов
  const isProcessing = phase === 'processing';
  //Флаг возможности сохранения файлов
  const canSave = useMemo(() => files.length > 0 && phase === 'ready', [files.length, phase]);
  //Флаг отображения зоны для перетаскивания файлов
  const showDropzone = files.length === 0;
  //Флаг отображения списка загруженных файлов
  const showFilesList = files.length > 0;
  
//Функция для очистки локального состояния модалки
  const resetLocalState = useCallback(() => {
  setFiles([]);
  setIsDragOver(false);
  setPhase('empty');
  setProgress(0);
  setIsSizeErrorOpen(false);
  if (progressTimerRef.current) {
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }
}, []);

  //Очистка таймера индикации прогресса при размонтировании компонента
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  //Функция для начала локальной индикации прогресса (визуальная обработка UI, не реальный upload)
  const startLocalProgress = () => {
  if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
  setPhase('processing');
  setProgress(0);

    let current = 0;
    progressTimerRef.current = window.setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
        setPhase('ready');
      }
    }, 90);
  };
  //Функция для открытия диалога выбора файлов

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  //Функция для добавления  файлов в массив загруженных файлов
  const addIncomingFiles = (incoming: File[]) => {
    if (!incoming.length) return;

    const prepared: UiFile[] = [];
    incoming.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setIsSizeErrorOpen(true);
        return;
      }

      prepared.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        file,
      });
    });

    setFiles((prev) => {
      // Без сложной логики: просто добавляем, убирая дубли по id
      const map = new Map(prev.map((item) => [item.id, item]));
      prepared.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });

    // Если добавили хотя бы один валидный файл — показываем локальную индикацию прогресса (как в макете).
    if (prepared.length > 0) {
      startLocalProgress();
    }
  };

  //Функция для обработки  для скрытого инпута
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    addIncomingFiles(incoming);
    event.target.value = '';
  };

  //Функция для обработки перетаскивания файлов над дропзоной
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  //Функция для обработки входа файлов в дропзону
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  //Функция для обработки выхода файлов из дропзоны
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  //Функция для обработки сброса файлов в дропзону
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const incoming = Array.from(event.dataTransfer.files ?? []);
    setIsDragOver(false);
    addIncomingFiles(incoming);
  };

  //Функция для удаления файла из массива загруженных файлов
  const removeFile = (id: string) => {
    if (isProcessing) return;
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  //Функция для обработки отмены загрузки файлов
  const handleCancel = () => {
    resetLocalState();
    onClose();
  };

  //Функция для обработки сохранения файлов
  const handleSave = async () => {
    if (!canSave) return;
    onSubmit(files.map((item) => item.file));
    resetLocalState();
    onClose();
  };

  //Функция для обработки закрытия модалки с ошибкой размера файла
  const handleSizeErrorClose = () => {
    setIsSizeErrorOpen(false);
  };
  //Функция для получения расширения файла

  const getFileExt = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

//Функция для отображения thumbnail файла
const renderFileThumb = (name: string) => {
  if (phase === 'processing') {
    return (
      <span className="inline-flex h-14 w-12 items-center justify-center rounded-[6px] bg-neutral-100">
        <Spinner size="sm" progress={progress} />
      </span>
    );
  }
  //Получение расширения файла

  const ext = getFileExt(name);

  if (ext === 'pdf') {
    return (
      <span className="inline-flex h-14 w-12 items-center justify-center rounded-[6px] border border-(--color-brand-300) bg-brand-50 text-[10px] font-semibold text-(--color-brand-700)">
        PDF
      </span>
    );
  }

  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') {
    return (
      <span className="inline-flex h-14 w-12 items-center justify-center rounded-[6px] bg-neutral-100 text-[10px] text-(--color-text-secondary)">
        IMG
      </span>
    );
  }

  return (
    <span className="inline-flex h-14 w-12 items-center justify-center rounded-[6px] bg-neutral-100">
      <PaperclipIcon className="h-5 w-11 text-(--color-text-secondary)" />
    </span>
  );
};

  return (
    <> {/* Модалка для отображения ошибки размера файла */}
      <Modal
        isOpen={isOpen && isSizeErrorOpen}
        onClose={handleSizeErrorClose}
        closeOnOverlay={true}
        showClose={false}
        className="error-upload-modal"
      >
        <div className="flex flex-col items-center gap-10 text-center">
          <p className="text-2xl leading-[1.1] text-(--color-text-primary)">
            Размер файла
            <br />
            превышает <span className="text-danger-500">{MAX_FILE_SIZE_MB} MB</span>
          </p>
          <Button type="button" size="lg" onClick={handleSizeErrorClose} className="w-full max-w-[362px]">
            Хорошо
          </Button>
        </div>
      </Modal>

      {/* Модалка для загрузки файлов */}
      <Modal
        isOpen={isOpen && !isSizeErrorOpen}
        onClose={handleCancel}
        closeOnOverlay={!isProcessing}
        className="download-files-modal rounded-[8px] py-9 px-10 gap-5"
        footer={
          <>
            <Button
              type="button"
              size="lg"
              variant={canSave ? 'primary' : 'outlined'}
              onClick={handleSave}
              disabled={!canSave}
              className={
                canSave
                  ? 'w-full max-w-[205px]'
                  : 'w-full max-w-[205px] download-files-modal__btn-neutral disabled:opacity-100'
              }
            >
              Сохранить
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outlined"
              onClick={handleCancel}
              className="w-full max-w-[205px] download-files-modal__btn-cancel"
            >
              Отменить
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
        
          {/* Верхняя кнопка выбора файла */}
          <Button
            type="button"
            size="lg"
            onClick={openFileDialog}
            className="mx-auto w-full max-w-[363px] md:w-[363px] rounded-[8px] px-7  text-sm font-medium text-(--color-primary-white) transition hover:bg-(--color-brand-700)"
          >
            {files.length > 0 ? 'Загрузить ещё' : 'Выберите файл на вашем устройстве'}

          </Button>

          {/* Фиксированная рабочая область, чтобы высота модалки не "прыгала" */}
          <div className="mx-auto  w-full max-w-[431px] h-[236px]">
            {showDropzone ? (
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                tabIndex={0}
                className={[
                  'h-full w-full rounded-control',
                  'px-4 py-6',
                  'flex flex-col items-center justify-center text-center transition',
                  'hover:border-0 hover:bg-brand-200 focus:border-0 focus:bg-brand-200 focus:outline-none',
                  isDragOver
                    ? 'border-0 bg-brand-200'
                    : 'border-4 border-dashed border-(--color-brand-300) bg-brand-50',
                  isProcessing ? 'opacity-60' : '',
                ].join(' ')}
              >
                <PlusIcon className="h-23 w-23 text-(--color-brand-600)" />
                <p className="mt-3 text-sm leading-[1.35] text-(--color-text-primary)">
                  Или перетащите файлы сюда
                  <br />
                  {MAX_FILE_SIZE_MB}MB максимальный размер файла
                </p>
              </div>
            ) : null}

            {showFilesList ? (
              <div className="h-full w-full overflow-y-auto pr-1 flex flex-col gap-3">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="w-full flex items-center justify-between gap-3 rounded-control  px-2 py-2"
                  >
                    
                    <div className="min-w-0 flex items-center gap-2">
                      {renderFileThumb(item.name)}
                      <span title={item.name} className="truncate text-lg text-(--color-text-secondary)">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-lg text-(--color-text-secondary)">{formatAttachmentFileSize(item.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        disabled={phase === 'processing'}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-(--color-brand-600) transition hover:bg-(--color-brand-100) disabled:opacity-60"
                        aria-label={`Удалить ${item.name}`}
                      >
                        <DeleteIcon className="h-6 w-6 text-brand-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

        </div>
      </Modal>

      {/* Скрытый input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </>
  );
}
  

