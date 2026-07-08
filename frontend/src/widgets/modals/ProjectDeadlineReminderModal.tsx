import { Button, Modal } from '@/shared/ui';

export type ProjectDeadlineReminderModalProps = {
  isOpen: boolean;
  projectName?: string | null;
  onAcknowledge: () => void;
  onChangeDeadline: () => void;
};

export function ProjectDeadlineReminderModal({
  isOpen,
  projectName,
  onAcknowledge,
  onChangeDeadline,
}: ProjectDeadlineReminderModalProps) {
  const projectNameLabel = projectName?.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onAcknowledge}
      showClose={false}
      closeOnOverlay={true}
      className="project-deadline-reminder-modal"
      title={<h3 className="project-deadline-reminder-modal__title">Ой-ой...</h3>}
      footer={
        <div className="project-deadline-reminder-modal__actions">
          <Button
            type="button"
            size="md"
            className="project-deadline-reminder-modal__button project-deadline-reminder-modal__button--primary"
            onClick={onChangeDeadline}
          >
            Изменить дату
          </Button>
          <Button
            type="button"
            size="md"
            variant="tonal"
            className="project-deadline-reminder-modal__button project-deadline-reminder-modal__button--secondary"
            onClick={onAcknowledge}
          >
            Понял(а)
          </Button>
        </div>
      }
    >
      <p className="project-deadline-reminder-modal__text">
        {projectNameLabel
          ? `Кажется, срок по проекту «${projectNameLabel}» уже прошёл!`
          : 'Кажется, срок по проекту уже прошёл!'}
      </p>
    </Modal>
  );
}
