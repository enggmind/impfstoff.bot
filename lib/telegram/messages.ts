import fs from 'fs'
import { paths } from './paths'
import { logger } from '../logger'
import TelegramBot from 'node-telegram-bot-api'
import { ACTIONS, DISABLE_PAGE_PREVIEW } from '.'

export type Message = {
  id: number
  message: string
  text?: string
  omit?: boolean
  options?: TelegramBot.SendMessageOptions
}
const logAction = (action: string, chat: TelegramBot.Chat, amountUsers?: number, _isPresent = false) => {
  const { first_name, username, id } = chat

  logger.info(
    {
      amountUsers,
      first_name,
      id,
      username,
      ...(action === 'HELP' ? { _isPresent } : {}),
    },
    action,
  )
}

export function saveNewUserIds(userIds: string): void {
  try {
    fs.writeFileSync(paths.users.fileName, userIds)
  } catch (error) {
    logger.error({ error }, 'FAILED_SAVING_FILE')
  }
}

export function getJoin(userIds: number[], chat: TelegramBot.Chat): Message {
  const { id } = chat
  const _isPresent = userIds.includes(id)

  if (_isPresent) return { id, message: '❌ You are already part of the team. 😘' }

  saveNewUserIds(JSON.stringify({ ids: [...userIds, id] }))
  logAction('JOIN', chat, userIds.length + 1)

  return {
    id,
    message:
      '👋🏼 Welcome to the team. Just wait for new avail. appointments now. In the meantime, feel free to check upon this website overall avail. dates: https://doctolib.de/',
  }
}

export function getHelp(userIds: number[], chat: TelegramBot.Chat): Message {
  const { id } = chat
  const _isPresent = userIds.includes(id)

  logAction('HELP', chat, userIds.length, _isPresent)

  if (_isPresent)
    return {
      id,
      message:
        '\
‼️ You are already part of the team, just sit back, relax and wait for new upcoming, hopefully, available appointments seen in less than 10 minutes. 😘 \n\n\
❗️ We send the avail. appointments over a time box of 10 minutes (in case new ones pop up). 😘)\n\n\
‼️ Based on the statistics we’ve collected, a "significantly earlier" appointment stays available for about *20 seconds*.\
That is the amount of time that you have to choose the dates for the first and second shots, agree to the notices, fill the form with your information and confirm. Being able to do this all for the first time in 20 seconds is virtually impossible, so we recommend that you book an appointment for a later date to get used to the process, and then cancel that appointment if you want to try to book an earlier date.',
    }

  return {
    id,
    message: '👋🏼 Press `Join` in order to join on the queue for fetching available vaccine appointments in Berlin.',
    omit: false,
    options: {
      reply_markup: {
        inline_keyboard: [
          [{ text: ACTIONS.join.copy, callback_data: ACTIONS.join.enum }],
          [{ text: ACTIONS.contribute.copy, callback_data: ACTIONS.contribute.enum }],
        ],
      },
    },
  }
}

export function getStop(userIds: number[], chat: TelegramBot.Chat): Message {
  const { id } = chat
  const _isPresent = userIds.includes(id)

  if (_isPresent) {
    const filteredUserIds = userIds.filter((currentId) => currentId !== id)

    saveNewUserIds(JSON.stringify({ ids: filteredUserIds }))
    logAction('STOP', chat, userIds.length - 1)

    return {
      id,
      message:
        '👋🏼 Ok, we will no longer send you any messages. If you want to join us again, just press `Join` below. ❤️',
      options: {
        reply_markup: {
          inline_keyboard: [
            [{ text: ACTIONS.join.copy, callback_data: ACTIONS.join.enum }],
            [{ text: ACTIONS.contribute.copy, callback_data: ACTIONS.contribute.enum }],
          ],
        },
      },
    }
  }

  return {
    id,
    message: "☑️ You've already been removed. If you want to join us again, just press `Join` below. ❤️",
    options: {
      reply_markup: {
        inline_keyboard: [[{ text: ACTIONS.join.copy, callback_data: ACTIONS.join.enum }]],
      },
    },
  }
}

export function getTwitter(chat: TelegramBot.Chat): Message {
  const { id } = chat

  return {
    id,
    message: '🐥 We are not on twitter, what a shame ❤️',
    options: {
      [DISABLE_PAGE_PREVIEW]: true,
    },
  }
}

export function getContribute(chat: TelegramBot.Chat, shouldLog = false): Message {
  const { id } = chat

  if (shouldLog) logAction('CONTRIBUTE', chat)

  return {
    id,
    options: {
      [DISABLE_PAGE_PREVIEW]: true,
    },
    message: `Hey ${
      chat.first_name || 'you'
    }, Am enggmind, I made this bot to read from commandline , the base fork is from  https://github.com/guicheffer/impfstoff
❗️ Open issues and pull requests in our repo here: https://github.com/enggmind/impfstoff.bot\n❤️`,
  }
}
