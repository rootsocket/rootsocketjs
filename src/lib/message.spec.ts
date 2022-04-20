import test from 'ava';

import {
  createChannelMessage,
  createPing,
  createPong,
  createSubscriptionAdd,
  createSubscriptionRemove,
  ERROR,
  isError,
  isPing,
  isPong,
  isSubscriptionError,
  messageToString,
  PING,
  PONG,
  stringToMessage,
  SUBSCRIPTION_ADD,
  SUBSCRIPTION_ERROR_DETAIL,
  SUBSCRIPTION_REMOVE,
} from './message';

test('messageToString', (t) => {
  const event = 'a';
  const data = { raw: 'b' };
  const message = {
    event,
    data,
  };
  const result = messageToString(message);
  t.is(result.includes(event), true);
  t.is(result.includes(data.raw), true);
  t.is(result.includes('no'), false);
});

test('stringToMessage', (t) => {
  const event = 'a';
  const data = { raw: 'b' };
  const result = stringToMessage(JSON.stringify({ event, data }));
  t.is(result.event, event);
  t.is(result.data.raw, data.raw);
  t.is(result.data.detail, undefined);
});

test('primitiveTypes', (t) => {
  [
    [PING, createPing],
    [PONG, createPong],
  ].forEach((i: unknown) => {
    t.is(i[1]().event, i[0]);
  });
});

test('subscriptionTypes', (t) => {
  const auth = 'test';
  const channel = 'roo';
  [
    [SUBSCRIPTION_REMOVE, createSubscriptionRemove, [channel]],
    [SUBSCRIPTION_ADD, createSubscriptionAdd, [channel]],
    [SUBSCRIPTION_ADD, createSubscriptionAdd, [channel, auth]],
  ].forEach((i: unknown) => {
    const messageType = i[0];
    const func = i[1];
    const args = i[2];

    const result = func(...args);
    t.is(result.event, messageType);

    if (args.length > 1) {
      t.is(result.data.auth, auth);
    }
  });
});

test('channelMessage', (t) => {
  const channel = 'a';
  const raw = 'test';

  const result = createChannelMessage(channel, raw);

  t.is(result.event, channel);
  t.is(result.data.raw, raw);
});

test('subscriptionError', (t) => {
  const channel = 'a';
  const message = {
    event: ERROR,
    data: { detail: SUBSCRIPTION_ERROR_DETAIL, where: channel },
  };

  t.is(isSubscriptionError(message), true);
});

test('handlePrimitiveMessages', (t) => {
  [
    [PING, isPing],
    [PONG, isPong],
    [ERROR, isError],
  ].forEach((i: unknown) => {
    const m = { event: i[0] };
    t.is(i[1](m), true);
  });
});
