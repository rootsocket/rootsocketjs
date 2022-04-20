import test from 'ava';

import { log } from './logger';

test('log', (t) => {
  const message = 'test';
  const details = {};
  const logger = (m) => {
    t.is(m.detail, message);
    t.is(m.more, details);
  };

  log(message, details, logger);
});
