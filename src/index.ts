import dotenv from 'dotenv';
import qrcodeTerminal from 'qrcode-terminal';
import { Message, WechatyBuilder } from 'wechaty';
import { initChatGPT, replyMessage } from './chatgpt.js';
import config from './config.js';

let bot: any = {};
const startTime = new Date();
initProject();
async function onMessage(msg: Message) {
  // 避免重复发送
  if (msg.date() < startTime) {
    return;
  }

  const contact = msg.talker();
  const receiver = msg.listener();
  const content = msg.text().trim();
  const room = msg.room();
  const alias = (await contact.alias()) || (await contact.name());

  if (!receiver) {
    console.error('receiver is null');
    return;
  }

  console.log(`${contact.id} ${alias} ${await receiver.name()} ${content}`);
  const isText = msg.type() === bot.Message.Type.Text;
  if (msg.self()) {
    return;
  }

  if (room && isText && receiver) {
    const topic = await room.topic();
    const pattern = RegExp(`^@${receiver.name()}\\s+${config.groupKey}[\\s]*`);
    const droplinkPattern = /<a.*?>(.*?)<\/a>/;
    if ((await msg.mentionSelf()) || content.includes(receiver.id)) {
      console.log(
        `Group name: ${topic} talker: ${await contact.name()} content: ${content} room:${room}`
      );
      let groupContent = content;

      if (pattern.test(content)) {
        groupContent = groupContent.replace(pattern, '');
      }
      if (content.includes(receiver.id)) {
        groupContent = groupContent.replace(droplinkPattern, '');
      }
      replyMessage(msg, groupContent);
    } else {
      console.log('no mention');
    }
  } else if (isText) {
    console.log(`talker: ${alias} content: ${content}`);
  }
}

function onScan(qrcode) {
  qrcodeTerminal.generate(qrcode); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('');

  console.log(qrcodeImageUrl);
}

async function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  if (config.autoReply) {
    console.log(`Automatic robot chat mode has been activated`);
  }
}

function onLogout(user) {
  console.log(`${user} has logged out`);
}

async function onFriendShip(friendship) {
  if (friendship.type() === 2) {
    if (config.friendShipRule.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

async function initProject() {
  try {
    dotenv.config();
    initChatGPT();
    bot = WechatyBuilder.build({
      name: 'WechatEveryDay',
      puppet: 'wechaty-puppet-wechat', // 如果有token，记得更换对应的puppet
      puppetOptions: {
        uos: true,
      },
    });

    bot
      .on('scan', onScan)
      .on('login', onLogin)
      .on('logout', onLogout)
      .on('message', onMessage);
    if (config.friendShipRule) {
      bot.on('friendship', onFriendShip);
    }

    bot
      .start()
      .then(() => console.log('Start to log in wechat...'))
      .catch((e) => console.error(e));
  } catch (error) {
    console.log('init error: ', error);
  }
}
