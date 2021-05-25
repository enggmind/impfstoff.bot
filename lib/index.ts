import dotenv from 'dotenv'
dotenv.config()

import { send } from './bots'
import { logger } from './logger'
import readline from 'readline'

const urls = new Map([
  ['arena', 'https://bit.ly/2PL4I8J'],
  ['tempelhof', 'https://bit.ly/2PONurc'],
  ['messe', 'https://bit.ly/3b0xCJr'],
  ['velodrom', 'https://bit.ly/3thD8h7'],
  ['tegel', 'https://bit.ly/3eeAIeT'],
  ['erika', 'https://bit.ly/2QIki5J'],
]);

const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
});

// Interval for checking vaccines appointment
let it = urls.entries()
rl.on('line', (line) => {
  const msgsQueue: string[] = []
  let next = it.next()
  if(next.done) {
      it = urls.entries()
      next = it.next()
      logger.info(`❤️'`)
  }
  const place = next.value[0]
  const link = next.value[1]
  try {
      const json = JSON.parse(line)
      if (json.total > 0)
      msgsQueue.push(`💉 Available slots in _${place}_ at link ${link}`)
  } catch(e) {
      logger.info(`caught excepetion ${e.toString()} got ${line}`)
      process.exit(1)
  }
  msgsQueue.forEach((message) => send(message))
})
