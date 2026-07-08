import { useNavigate } from 'react-router-dom';

import { queryClient } from '@/app/providers/query-client';
import { logout } from '@/shared/api';
import { clearSession } from '@/shared/lib/auth';
import { clearConfirmResendCooldown, clearPendingConfirmEmail } from '@/shared/lib/pendingRegistration';
import { Button, Modal } from '@/shared/ui';

export type ConfirmExitModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ConfirmExitModal({ isOpen, onClose }: ConfirmExitModalProps) {
  const navigate = useNavigate();

  const handleExit = async () => {
    try {
      await logout();
    } catch {
      // Do local sign out even if request fails.
    }
    clearSession();
    clearPendingConfirmEmail();
    clearConfirmResendCooldown();
    queryClient.clear();
    onClose();
    navigate('/login');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showClose={false}
      closeOnOverlay={true}
      className="profile-exit-modal"
      title={<h3 className="profile-exit-modal__title">Вы уверены, что хотите выйти?</h3>}
      footer={
        <div className="profile-exit-modal__actions">
          <Button type="button" size="lg" onClick={handleExit}>
            Да
          </Button>
          <Button type="button" size="lg" variant="outlined" onClick={onClose}>
            Нет
          </Button>
        </div>
      }
    >
      <div />
    </Modal>
  );
}
