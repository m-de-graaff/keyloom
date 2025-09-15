#!/usr/bin/env node
import { Command } from 'commander';
import { init } from './commands/init';
import { migrate } from './commands/migrate';
import { dev } from './commands/dev';

const program = new Command();
program.name('keyloom').description('Keyloom CLI').version('0.0.0');

program.command('init').action(init);
program.command('migrate').action(migrate);
program.command('dev').option('--smtp', 'start dev SMTP viewer').action(dev);

program.parse();
