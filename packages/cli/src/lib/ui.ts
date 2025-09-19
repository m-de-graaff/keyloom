import chalk from 'chalk'
import ora, { Ora } from 'ora'

export function banner(title: string) {
  console.log('\n' + chalk.bold.cyan(title))
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

