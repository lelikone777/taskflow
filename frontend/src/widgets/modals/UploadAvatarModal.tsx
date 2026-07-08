import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';

import { uploadAvatar } from '@/shared/api';
import { AddImageIcon, Button, Modal } from '@/shared/ui';

export type UploadAvatarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void | Promise<void>;
};

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function parseUploadError(err: unknown) {
  if (isAxiosError(err)) {
    const error = err.response?.data?.error;
    const detail = err.response?.data?.detail;
    const details = err.response?.data?.details;

    if (typeof error === 'string') {
      return error;
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg);
    }

    if (Array.isArray(details) && details[0]?.message) {
      return String(details[0].message);
    }
  }

  return 'Не удалось загрузить аватар.';
}

export function UploadAvatarModal({ isOpen, onClose, onUploaded }: UploadAvatarModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setErrorMessage(null);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const openFileDialog = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    const isValidType = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isValidType) {
      setErrorMessage('Поддерживаются только файлы JPG, JPEG или PNG');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Размер файла превышает 2 МБ');
      event.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      await uploadAvatar(file);
      if (onUploaded) {
        await onUploaded();
      }
      onClose();
    } catch (err) {
      setErrorMessage(parseUploadError(err));
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlay={true} className="profile-upload-modal">
        <div className="profile-upload-modal__body">
          <div className="profile-upload-modal__preview">
            <AddImageIcon />
            <span>Добавьте свое фото</span>
          </div>

          {errorMessage ? <p className="profile-upload-modal__error">{errorMessage}</p> : null}

          <p className="profile-upload-modal__hint">Максимальный размер файла 2 МБ, формат JPG/JPEG/PNG</p>

          <Button
            type="button"
            size="lg"
            className="profile-upload-modal__button"
            onClick={openFileDialog}
            disabled={isUploading}
          >
            {isUploading ? 'Загрузка...' : 'Добавить фото'}
          </Button>
        </div>
      </Modal>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".jpeg,.jpg,.png,image/jpeg,image/png"
        onChange={handleFileChange}
      />
    </>
  );
}
