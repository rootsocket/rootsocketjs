import test from 'ava';

import {
  retrieveChannelTokenCallback,
  retrieveConnectionTokenCallback,
} from './connection';

const testFunc = async (t, f) => {
  const token = 'test';
  const options = {
    method: 'PUT',
  };
  const url = 'http://example.com';
  const fetcher = async (fUrl: string, fOptions: RequestInit) => {
    t.is(url, fUrl);
    t.is(options.method, fOptions.method);

    return {
      json: async () => ({ token }),
    };
  };
  const resultFunction = f(url, fetcher as never, options);
  const result = await resultFunction();
  t.is(token, result);
};

test('retrieveConnectionTokenCallback', async (t) => {
  await testFunc(t, retrieveConnectionTokenCallback);
});
test('retrieveChannelTokenCallback', async (t) => {
  await testFunc(t, retrieveChannelTokenCallback);
});
