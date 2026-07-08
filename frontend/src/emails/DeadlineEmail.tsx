import { Column, Link, Row, Section, Text } from '@react-email/components';
import EmailTemplate from './EmailTemplate';
import { emailConfig } from './config/email.config';

type DeadlineEmailProps = {
  task_title?: string;
  task_description?: string;
  task_url?: string;
};

export const DeadlineEmail = ({
  task_title = '[название задачи]',
  task_description = '[описание задачи]',
  task_url = '',
}: DeadlineEmailProps) => {
  return (
    <EmailTemplate title={emailConfig.emails.deadline.title}>
      <Text className="mt-0 mb-[20px] text-body">{emailConfig.defaultGreeting}</Text>
      <Text className="mt-0 mb-[20px] text-body">
        Это автоматическое уведомление от {emailConfig.brandName}. По вашей задаче подходит срок завершения.
      </Text>
      <Text className="m-0 text-body">Детали задачи:</Text>
      <Section className="mt-[12px] mb-[20px]">
        <Row>
          <Column className="w-[12px] align-top">
            <Text className="m-0 text-body">•</Text>
          </Column>
          <Column>
            <Text className="m-0 text-body">Название: {task_title}</Text>
          </Column>
        </Row>
        <Row>
          <Column className="w-[12px] align-top">
            <Text className="m-0 text-body">•</Text>
          </Column>
          <Column>
            <Text className="m-0 text-body">Описание: {task_description}</Text>
          </Column>
        </Row>
      </Section>
      <Text className="mt-0 mb-[20px] text-body">
        Мы рекомендуем проверить текущий статус задачи и внести необходимые обновления.
      </Text>
      {task_url ? (
        <Link href={task_url} className="mt-0 mb-[20px] block text-blue-600 no-underline">
          Перейти к задаче
        </Link>
      ) : null}
      <Text className="mt-0 mb-[20px] text-body">
        Вы получили это письмо, так как в настройках вашего профиля включены уведомления о дедлайнах.
      </Text>
      <Text className="m-0 text-body">{emailConfig.defaultRegards}</Text>
    </EmailTemplate>
  );
};

export default DeadlineEmail;

