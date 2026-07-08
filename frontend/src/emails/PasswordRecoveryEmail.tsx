import { Link, Text } from '@react-email/components';
import EmailTemplate from './EmailTemplate';
import { emailConfig } from './config/email.config';

type PasswordRecoveryEmailProps = {
  reset_url?: string;
};

export const PasswordRecoveryEmail = ({
  reset_url = '[ссылка]',
}: PasswordRecoveryEmailProps) => {
  return (
    <EmailTemplate title={emailConfig.emails.passwordRecovery.title}>
      <Text className="mt-0 mb-[20px] text-body">{emailConfig.defaultGreeting}</Text>
      <Text className="mt-0 mb-[20px] text-body">
        Мы получили запрос на сброс пароля для вашей учетной записи в таск-трекере TaskFlow, связанной
        с этим адресом электронной почты. Чтобы выбрать новый пароль, перейдите по ссылке ниже:
      </Text>
      <Link href={reset_url} className="mt-0 mb-[20px] block text-blue-600 no-underline">
        {reset_url}
      </Link>
      <Text className="mt-0 mb-[20px] text-body">Эта ссылка будет действительна в течение 24 часов.</Text>
      <Text className="mt-0 mb-[20px] text-body">
        Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      </Text>
      <Text className="m-0 text-body">{emailConfig.defaultRegards}</Text>
    </EmailTemplate>
  );
};

export default PasswordRecoveryEmail;
