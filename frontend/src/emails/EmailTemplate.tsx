import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
} from '@react-email/components';
import type { ReactNode } from 'react';
import { emailConfig } from './config/email.config';
import tailwindConfig from './config/tailwind.config';

type EmailTemplateProps = {
  title: string;
  children: ReactNode;
  logoUrl?: string;
};

const defaultLogoUrl = emailConfig.logoUrl;

export const EmailTemplate = ({
  title,
  children,
  logoUrl = defaultLogoUrl,
}: EmailTemplateProps) => {
  return (
    <Html>
      <Preview>{title}</Preview>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body className="mx-auto my-auto w-full bg-brand-300 px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[640px] bg-neutral-0 px-[24px] py-[24px]">
            <Section className="mx-auto mb-[44px] max-w-[592px]">
              <Row>
                <Column className="w-[102px]">
                  <Img
                    src={logoUrl}
                    width="95"
                    height="95"
                    alt="TaskFlow logo"
                    className="block rounded-full object-cover"
                  />
                </Column>
                <Column>
                  <Heading as="h1" className="m-0 text-heading leading-none tracking-normal">
                    {title}
                  </Heading>
                </Column>
              </Row>
            </Section>
            <Section className="mx-auto max-w-[563px] text-body leading-none tracking-normal text-black">
              {children}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailTemplate;
