import { describe, it } from 'vitest'

// Contract test skeletons for raw adapters. These run only when corresponding env URLs are provided.
// Set the following env vars locally to enable:
//  - KEYLOOM_TEST_PG = connection enabled (client must be created in your local test setup)
//  - KEYLOOM_TEST_MYSQL = connection enabled
//  - KEYLOOM_TEST_MONGO = connection enabled
// For CI in this repo, these remain disabled to keep tests hermetic.

describe.skip('raw adapters contract (requires external dbs)', () => {
  it('placeholder (enable with env + local setup)', () => {})
})

