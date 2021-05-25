import dotenv from 'dotenv'
dotenv.config()

import { send } from './bots'
import { logger } from './logger'
import { fetchImpfstoffLink } from './impfstoff-link'

const TIMER_BOT_FETCH = 2 * 1000 // 2 seconds

const urls = new Map([
  ['arena', 'https://bit.ly/2PL4I8J'],
  ['tempelhof', 'https://bit.ly/2PONurc'],
  ['messe', 'https://bit.ly/3b0xCJr'],
  ['velodrom', 'https://bit.ly/3thD8h7'],
  ['tegel', 'https://bit.ly/3eeAIeT'],
  ['erika', 'https://bit.ly/2QIki5J'],
]);

// Interval for checking vaccines appointment
let it = urls.entries()
setInterval(() => {
  const msgsQueue: string[] = []
  let next = it.next()
  if(next.done) {
      it = urls.entries()
      next = it.next()
  }
  const place = next.value[0]
  const link = next.value[0]
  logger.info(`Polled _${place}_`)
  fetchImpfstoffLink(place)
  .then((json) => {
      logger.info(`Polled _${place}_ got ${json.toString()}`)
      if (json.total > 0)
          msgsQueue.push(`💉 Available slots in _${place}_ at link ${link}`)
      msgsQueue.forEach((message) => send(message))
  })
    .catch((error) => logger.error({ error }, 'FAILED_FETCH'))
}, TIMER_BOT_FETCH)
