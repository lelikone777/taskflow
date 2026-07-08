import { render } from '@react-email/components';
import DeadlineEmail from './DeadlineEmail';
import PasswordRecoveryEmail from './PasswordRecoveryEmail';
import WelcomeEmail from './WelcomeEmail';

export type RegistrationEmailVariables = {
  confirmation_url: string;
};

export type PasswordRecoveryEmailVariables = {
  reset_url: string;
};

export type DeadlineEmailVariables = {
  task_title: string;
  task_description: string;
  task_url?: string;
};

export async function renderRegistrationEmailHtml(
  variables: RegistrationEmailVariables
): Promise<string> {
  return render(<WelcomeEmail confirmation_url={variables.confirmation_url} />, { pretty: true });
}

export async function renderPasswordRecoveryEmailHtml(
  variables: PasswordRecoveryEmailVariables
): Promise<string> {
  return render(<PasswordRecoveryEmail reset_url={variables.reset_url} />, { pretty: true });
}

export async function renderDeadlineEmailHtml(
  variables: DeadlineEmailVariables
): Promise<string> {
  return render(
    <DeadlineEmail
      task_title={variables.task_title}
      task_description={variables.task_description}
      task_url={variables.task_url}
    />,
    {
      pretty: true,
    },
  );
}
