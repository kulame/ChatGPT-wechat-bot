import { Configuration, OpenAIApi } from 'openai';
import config from './config.js';
import { buildSessionQuery } from './session.js';
import { retryRequest } from './utils.js';

let openai: OpenAIApi | null = null;

export function initChatGPT() {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  openai = new OpenAIApi(configuration);
}

async function getChatGPTReply(msg, content) {
  // response is a markdown-formatted string

  if (openai === null) {
    throw new Error('openai not initialized');
  }
  const talker = msg.talker();

  const chatgptQuery = buildSessionQuery(content);
  console.log(`request openai ${chatgptQuery}`);
  console.time('chatgpt_fetch');
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: chatgptQuery,
    temperature: 1,
    max_tokens: 1200,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
    stop: ['#'],
  });
  const text = response.data.choices[0].text;
  console.timeEnd('chatgpt_fetch');
  console.log(`got chatgpt reply ${text}`);

  return response.data.choices[0].text;
}

export async function replyMessage(msg, content) {
  const contact = msg.room();
  const talker = msg.talker();
  const alias = (await talker.alias()) || (await talker.name());
  try {
    if (
      content.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
    ) {
      await contact.say('Previous conversation has been reset.');
      return;
    }
    const message = await retryRequest(
      () => getChatGPTReply(msg, content),
      config.retryTimes,
      500
    );

    if (
      (contact.topic && contact?.topic() && config.groupReplyMode) ||
      (!contact.topic && config.privateReplyMode)
    ) {
      const result = `@${alias} ${message}`;
      await contact.say(result);
      return;
    } else {
      await contact.say(message);
    }
  } catch (e: any) {
    console.error(e);
    if (e.message.includes('timed out')) {
      await contact.say(
        content +
          '\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
  }
}
