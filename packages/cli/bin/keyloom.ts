#!/usr/bin/env node
import { run } from '../src/index'

run(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})

