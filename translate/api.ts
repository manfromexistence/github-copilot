import { Elysia, t } from 'elysia';
import translate from './index.js';
import { isSupported, getCode } from './languages.js';

const app = new Elysia()
  .post('/translate', async ({ body }) => {
    const { text, language } = body;

    if (!text || !language) {
      return new Response('Missing text or language in request body', { status: 400 });
    }

    if (isSupported(language)) {
      try {
        const translatedText = await translate(text, { to: language });
        return { originalText: text, translatedText, language };
      } catch (error) {
        console.error('Translation error:', error);
        return new Response('Error during translation', { status: 500 });
      }
    } else {
      return { originalText: text, message: `Language '${language}' is not supported. Returning original text.`, language };
    }
  }, {
    body: t.Object({
        text: t.String(),
        language: t.String()
    })
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
