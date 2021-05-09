const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const paths = require("./paths.js");
const adminIds = require("./resources/admins.json").ids;
const logger = require("../logger");
const messages = require("./messages");

const botToken = process.env.TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

const ACTIONS = {
  help: {
    copy: "Help",
    enum: "help",
  },
  join: {
    copy: "Join",
    enum: "join",
  },
  stop: {
    copy: "Stop, please!",
    enum: "stop",
  },
};
const DISABLE_PAGE_PREVIEW = "disable_web_page_preview";
const DEFAULT_MESSAGE_OPTIONS = {
  [DISABLE_PAGE_PREVIEW]: true,
  parse_mode: "Markdown",
};

const isJoinMessage = (text) => text.match(/start|join/);
const isHelpMessage = (text) => text.match(/help|halp|what|hilfe|how/);
const isStopMessage = (text) => text.match(/stop|leave|exit|pause|quiet|mute/);

const readUserIds = () => JSON.parse(fs.readFileSync(paths.users.fileName)).ids;

const send = async ({ id, message, omit = true, options }) => {
  if (!omit) logger.info({ id, message }, "SEND");

  await bot.sendMessage(id, message, options);
};

let blockedUserIds = [];
let shouldDebounceBroadcast = false;
const broadcast = async (message, { force = false, ...options } = {}) => {
  // Force debounce on broadcast
  if (!force && shouldDebounceBroadcast)
    return Promise.reject({ message: "STILL_BROADCASTING", text: message });
  if (!force) shouldDebounceBroadcast = true;

  const userIds = readUserIds();

  // This will prioritize LIFO over the user ids when broadcasting
  blockedUserIds = [];
  const mapUsersPromises = readUserIds()
    .reverse()
    .map(
      (id, index) =>
        new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              return resolve(
                await send({
                  id,
                  message,
                  options: { ...DEFAULT_MESSAGE_OPTIONS, ...options },
                })
              );
            } catch (error) {
              if (error.message.includes("bot was blocked by the user")) {
                blockedUserIds.push(id);
                logger.error({ error, id }, "BLOCKED_USER_TO_REMOVE");
              } else {
                logger.error({ error, id }, "GENERAL_BROADCAST_ERROR");
              }

              reject(error);
            }
          }, index * 200);
        })
    );

  await Promise.all(mapUsersPromises).catch(() => {}); // No needs to log all promises

  if (blockedUserIds.length) {
    const userIdsWithoutBlockedOnes = readUserIds().filter(
      (currentId) => !blockedUserIds.includes(currentId)
    );

    messages.saveNewUserIds(JSON.stringify({ ids: userIdsWithoutBlockedOnes }));

    logger.warn(
      { oldAmount: userIds.length, blockedAmount: blockedUserIds.length },
      "REMOVED_USERS"
    );
  }

  // Return to normal state
  shouldDebounceBroadcast = false;
};

// Listen to messages
bot.on("message", ({ chat, text: rawText }) => {
  const { id } = chat;
  const text = rawText.toLowerCase();

  // Broadcast (only for admins)
  if (adminIds.includes(id) && text.startsWith("/broadcast")) {
    const message = text.replace("/broadcast ", "📣 ");

    return broadcast(message, {
      force: true, // Force broadcast to happen since it's a manual announcement
      [DISABLE_PAGE_PREVIEW]: false,
    })
      .then(() => logger.info(`📣 Broadcasted: "${text}"`, "SEND_BROADCAST"))
      .catch((error) => {
        logger.error(error);
      });
  }

  const userIds = readUserIds();

  if (isJoinMessage(text)) return send(messages.getJoin(userIds, chat));
  if (isStopMessage(text)) return send(messages.getStop(userIds, chat));
  if (isHelpMessage(text)) return send(messages.getHelp(userIds, chat));

  // Otherwise:
  let buttons = [
    [{ text: ACTIONS.help.copy, callback_data: ACTIONS.help.enum }],
  ];

  buttons.unshift(
    userIds.includes(id)
      ? [{ text: ACTIONS.stop.copy, callback_data: ACTIONS.stop.enum }]
      : [{ text: ACTIONS.join.copy, callback_data: ACTIONS.join.enum }]
  );

  return send({
    id,
    message:
      "🤔 Not sure what you mean, but maybe one of the following options can help you:",
    omit: false,
    options: {
      reply_markup: {
        inline_keyboard: buttons,
      },
    },
  });
});

// Listen to queries from inline keyboards
bot.on("callback_query", async ({ data: action, message }) => {
  const { chat } = message;
  const userIds = readUserIds();
  const messageId = message.message_id;

  await bot.deleteMessage(chat.id, messageId);

  if (ACTIONS.join.enum === action)
    return send(messages.getJoin(userIds, chat));
  if (ACTIONS.stop.enum === action)
    return send(messages.getStop(userIds, chat));
  if (ACTIONS.help.enum === action)
    return send(messages.getHelp(userIds, chat));
});

// Error all errors
bot.on("polling_error", logger.error);

module.exports = { broadcast };
