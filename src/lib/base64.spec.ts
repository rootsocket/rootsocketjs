import test from 'ava';

import { base64decode, base64encode } from './base64';

test('encode', (t) => {
  t.is(base64encode('test'), 'dGVzdA==');
});

test('decode', (t) => {
  t.is(base64decode('dGVzdA=='), 'test');
});
