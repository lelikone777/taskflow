import { useMemo, useRef, useState } from 'react';

import { formatAttachmentFileSize } from '@/entities/task';
import type { Attachment } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from '@/shared/ui';
import { DeleteIcon, DownloadIcon, PaperclipIcon, PlusIcon } from '@/shared/ui/icons';

type TaskAttachmentsWidgetProps = {
  attachments: Attachment[];
  canUpload: boolean;
  isLoading: boolean;
  isUploading?: boolean;
  isDeleting?: boolean;
  error?: string | null;
  onUploadFiles: (files: File[]) => Promise<void>;
  onDeleteAttachment: (attachment: Attachment) => void;
  onDownloadAttachment?: (attachment: Attachment) => void;
};

const ATTACHMENTS_ACCEPT = '.txt,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const ALLOWED_EXTENSIONS = new Set(['txt', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx']);
const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function isSupportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  // Some browsers omit MIME for local files, so extension remains the fallback.
  return !file.type || ALLOWED_MIME_TYPES.has(file.type);
}

export function TaskAttachmentsWidget({
  attachments,
  canUpload,
  isLoading,
  isUploading = false,
  isDeleting = false,
  error = null,
  onUploadFiles,
  onDeleteAttachment,
  onDownloadAttachment,
}: TaskAttachmentsWidgetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const busy = isSubmitting || isUploading;
  const filesCount = attachments.length;
  const resolvedError = error ?? localError;

  const queueHasItems = queuedFiles.length > 0;
  const canSaveQueue = queueHasItems && !busy;

  const queueSizeLabel = useMemo(
    () => queuedFiles.reduce((acc, file) => acc + file.size, 0),
    [queuedFiles],
  );

  const attachFiles = (incomingFiles: File[]) => {
    if (!canUpload) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - attachments.length - queuedFiles.length;
    if (availableSlots <= 0) {
      setLocalError(`Можно прикрепить не более ${MAX_ATTACHMENTS} файлов.`);
      return;
    }

    const nextFiles: File[] = [];
    for (const file of incomingFiles) {
      if (!isSupportedFile(file)) {
        setLocalError('Неподдерживаемый тип файла. Разрешены TXT, PNG, JPG/JPEG, DOC/DOCX, XLS/XLSX.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setLocalError('Файл слишком большой. Максимальный размер — 10 МБ.');
        continue;
      }
      nextFiles.push(file);
    }

    if (nextFiles.length === 0) {
      return;
    }

    const uniqueFiles = nextFiles.filter(
      (candidate) =>
        !queuedFiles.some(
          (queued) =>
            queued.name === candidate.name &&
            queued.size === candidate.size &&
            queued.lastModified === candidate.lastModified,
        ),
    );

    setQueuedFiles((prev) => [...prev, ...uniqueFiles.slice(0, availableSlots)]);
    setLocalError(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    attachFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    attachFiles(files);
  };

  const handleSaveQueue = async () => {
    if (!canSaveQueue) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onUploadFiles(queuedFiles);
      setQueuedFiles([]);
      setLocalError(null);
    } catch {
      // Error is shown by the parent via prop error.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelQueue = () => {
    setQueuedFiles([]);
    setLocalError(null);
  };

  const removeQueuedFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleDownload = (attachment: Attachment) => {
    if (onDownloadAttachment) {
      onDownloadAttachment(attachment);
      return;
    }
    if (!attachment.s3Key) {
      setLocalError('Файл пока недоступен для скачивания. Обновите страницу и попробуйте снова.');
      return;
    }
    window.open(attachment.s3Key, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="task-attachments">
      <div className="task-attachments__header">
        <span className="task-attachments__title">Файлы</span>
        <span className="task-attachments__count">Кол-во {filesCount}</span>
      </div>

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            className="task-attachments__input"
            accept={ATTACHMENTS_ACCEPT}
            multiple
            onChange={handleInputChange}
          />

          <div
            className={cn('task-attachments__dropzone', isDragOver && 'task-attachments__dropzone--active')}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            aria-label="Выбрать файлы"
          >
            <PlusIcon className="h-6 w-6" />
            <div className="task-attachments__dropzone-text">
              <span>Перетащите файлы сюда</span>
              <span>максимальный размер 10 МБ</span>
            </div>
          </div>

          <div className="task-attachments__actions">
            <Button type="button" variant="outlined" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              Выберите файл
            </Button>
            <button
              type="button"
              className="task-attachments__add-link"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Добавить файл
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">
          Сначала сохраните задачу, затем добавляйте файлы.
        </p>
      )}

      {queueHasItems ? (
        <div className="task-attachments__queue">
          <div className="task-attachments__queue-header">
            <span>К загрузке: {queuedFiles.length}</span>
            <span>{formatAttachmentFileSize(queueSizeLabel)}</span>
          </div>
          <div className="task-attachments__list">
            {queuedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.lastModified}`} className="task-attachments__item">
                <div className="task-attachments__file">
                  <span className="task-attachments__file-icon">
                    <PaperclipIcon className="h-4 w-4" />
                  </span>
                  <div className="task-attachments__meta">
                    <span className="task-attachments__name">{file.name}</span>
                    <span className="task-attachments__size">{formatAttachmentFileSize(file.size)}</span>
                  </div>
                </div>
                <IconButton
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => removeQueuedFile(index)}
                  aria-label={`Удалить ${file.name} из очереди`}
                  title="Удалить из очереди"
                >
                  <DeleteIcon className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="task-attachments__queue-actions">
            <Button type="button" size="sm" onClick={handleSaveQueue} disabled={!canSaveQueue}>
              {busy ? 'Загрузка...' : 'Сохранить'}
            </Button>
            <Button type="button" size="sm" variant="outlined" onClick={handleCancelQueue} disabled={busy}>
              Отменить
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="task-attachments__empty">Загрузка файлов...</div>
      ) : filesCount === 0 && !queueHasItems ? (
        <div className="task-attachments__empty">Файлы пока не добавлены</div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="task-attachments__list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="task-attachments__item">
              <div className="task-attachments__file">
                <span className="task-attachments__file-icon">
                  <PaperclipIcon className="h-4 w-4" />
                </span>
                <div className="task-attachments__meta">
                  <span className="task-attachments__name">{attachment.filename}</span>
                  <span className="task-attachments__size">{formatAttachmentFileSize(attachment.size)}</span>
                </div>
              </div>
              <div className="task-attachments__controls">
                <IconButton
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  aria-label={`Скачать ${attachment.filename}`}
                  title="Скачать"
                >
                  <DownloadIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => onDeleteAttachment(attachment)}
                  aria-label={`Удалить ${attachment.filename}`}
                  title="Удалить"
                  disabled={isDeleting}
                >
                  <DeleteIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {resolvedError ? (
        <p className="task-attachments__error" role="alert">
          {resolvedError}
        </p>
      ) : null}
    </div>
  );
}
