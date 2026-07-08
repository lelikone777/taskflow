export function mapAttachmentError(message: string): string {
  if (message === 'Unsupported file type' || message === 'Недопустимый тип файла.') {
    return 'Неподдерживаемый тип файла. Разрешены PDF, PNG, JPG/JPEG, DOC/DOCX, XLS/XLSX.';
  }
  if (message === 'Attachment limit reached') {
    return 'Достигнут лимит вложений (10 файлов).';
  }
  if (message === 'Validation error') {
    return 'Проверьте параметры файла.';
  }
  if (message === 'Превышен допустимый размер файла.') {
    return 'Файл слишком большой. Максимальный размер — 10 МБ.';
  }
  return message;
}

export function formatAttachmentFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} КБ`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} МБ`;
}
