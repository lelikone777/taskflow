import { render } from "@react-email/components";
import { useEffect, useState, type ReactElement } from "react";

type EmailGeneratorProps = {
  emailContent: ReactElement;
}

const EmailGenerator = ({ emailContent }: EmailGeneratorProps) => {
  const [html, setHtml] = useState('');
  useEffect(() => {
    const generateEmail = async () => {
      const emailHtml = await render(emailContent, {
        pretty: true, // Для красивого форматирования кода
      });
      setHtml(emailHtml);
    };

    generateEmail();
  }, [emailContent]);

  if (!html) {
    return <div>Загрузка предпросмотра...</div>;
  }

  return (
    <div className="p-2">
      <iframe
        srcDoc={html}
        width='100%'
        height='750px'
        title="Email Preview"
      />

      {/* Опционально */}
      <details>
        <summary>Показать код HTML</summary>
        <pre>{html}</pre>
      </details>
    </div>
  );
}

export default EmailGenerator
