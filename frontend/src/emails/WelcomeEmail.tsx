import { Link, Text } from '@react-email/components';
import EmailTemplate from './EmailTemplate';
import { emailConfig } from './config/email.config';

type WelcomeEmailProps = {
  confirmation_url?: string;
};

export const WelcomeEmail = ({
  confirmation_url = '[ссылка]',
}: WelcomeEmailProps) => {
  return (
    <EmailTemplate title={emailConfig.emails.welcome.title}>
      <Text className="mt-0 mb-[20px] text-body">{emailConfig.defaultGreeting}</Text>
      <Text className="mt-0 mb-[20px] text-body">
        Спасибо за регистрацию в {emailConfig.brandName}. Мы рады, что вы выбрали нас для управления
        вашими проектами.
      </Text>
      <Text className="mt-0 mb-[20px] text-body">
        Чтобы начать работу и активировать ваш аккаунт, пожалуйста, подтвердите адрес электронной
        почты, перейдя по ссылке ниже:
      </Text>
      <Link href={confirmation_url} className="mt-0 mb-[20px] block text-blue-600 no-underline">
        {confirmation_url}
      </Link>
      <Text className="mt-0 mb-[20px] text-body">
        Если вы не регистрировались в нашей системе, просто проигнорируйте это письмо.
      </Text>
      <Text className="m-0 text-body">{emailConfig.defaultRegards}</Text>
    </EmailTemplate>
  );
};

export default WelcomeEmail;
