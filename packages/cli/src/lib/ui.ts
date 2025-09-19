import chalk from 'chalk'
import ora, { Ora } from 'ora'

export function banner(title: string) {
  console.log('\n' + chalk.bold.cyan(title))
}

export function detection(msg: string) {
  // Vercel-style ▲ marker
  console.log(chalk.cyan(`▲ ${msg}`))
}

export function section(title: string) {
  console.log('\n' + chalk.bold.white(title))
}

export function step(n: number, total: number, title: string) {
  console.log('\n' + chalk.cyan(`› Step ${n} of ${total}: ${title}`))
}

export const ui = {
  info: (msg: string) => console.log(chalk.gray(msg)),
  success: (msg: string) => console.log(chalk.green(`✔ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`! ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`✖ ${msg}`)),
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start()
}

export function list(items: string[], label?: string) {
  if (label) console.log(chalk.gray(label))
  for (const it of items) console.log(chalk.gray(`  • ${it}`))
}

export async function withCapturedStdout<T>(fn: () => Promise<T> | T): Promise<{ result: T; logs: string[] }> {
  const logs: string[] = []
  const orig = { log: console.log, warn: console.warn, info: console.info }
  console.log = (...a: any[]) => { logs.push(a.map(String).join(' ')) }
  console.warn = (...a: any[]) => { logs.push(a.map(String).join(' ')) }
  console.info = (...a: any[]) => { logs.push(a.map(String).join(' ')) }
  try {
    const result = await fn()
    return { result, logs }
  } finally {
    console.log = orig.log
    console.warn = orig.warn
    console.info = orig.info
  }
}

