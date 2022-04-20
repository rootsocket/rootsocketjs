import test from 'ava';

import {
  createChannelMessage,
  createPing,
  createPong,
  ERROR,
  PONG,
  SUBSCRIPTION_ERROR_DETAIL,
} from './message';
import { RootSocket } from './rootsocket';

const getMockedRootSocket = (
  constructorData: Partial<RootSocket>,
  func: (...args: unknown[]) => unknown
) => {
  class MockWebSocketClass {
    send = func;
  }

  const rs = new RootSocket({
    connectionUrl: '',
    server: '',
    webSocketClass: MockWebSocketClass as never,
    fetcher: async () => null,
    ...constructorData,
  });

  rs.onGenerateConnectionToken = async () =>
    `eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NDk5NTg5NzEsImFwcGxpY2F0aW9uSWRlbnRpZmllciI6IjdmYTk3YzgzMDA3ZjRlOTc2ZGY3MWNhMjE5ZGU0OWFjIiwiaWQiOiI0OGM3M2FkOWRhZmY0MDc4NzljMjI5NzVjYzY0NDM4NiIsImFsbG93Q2xpZW50U2VuZCI6dHJ1ZSwiYWxsb3dDbGllbnREYXRhIjp0cnVlLCJhbGxvd0NoYW5uZWxTdWJzY3JpcHRpb24iOnRydWUsImFsbG93Q2hhbm5lbEF1dGhvcml6YXRpb24iOmZhbHNlLCJjYXRlZ29yeSI6ImNvbm5lY3QifQ.5XblN8TKtBXo0_1vd6wHmCpQB2r7dFNVDJBADpNSfp2khMce_E4M7mzl2qKI-ai_43TxlUxWW1Xo6TtnCD7HdQ`;
  return rs;
};

test('send messages', async (t) => {
  const message = 'test';

  const rs = getMockedRootSocket({}, (m: string) => {
    t.is(m.includes(message), true);
  });

  await rs.connect();
  rs.send('a', message);
});

test('ping interval', async (t) => {
  const rs = getMockedRootSocket({}, undefined);
  await rs.connect();
  rs.onMessageOpen({ data: '' } as never);
  t.is(rs.isPingPongIntervalSet(), true);
});

test('handle ping from connection', async (t) => {
  const rs = getMockedRootSocket({}, (m: string) => {
    t.is(m.includes(PONG), true);
  });
  await rs.connect();
  rs.onMessageReceive({ data: JSON.stringify(createPing()) } as never);
});

test('handle pong from connection', async (t) => {
  const rs = getMockedRootSocket({}, undefined);
  await rs.connect();

  t.is(rs.isPingPongGood(), false);
  rs.onMessageReceive({ data: JSON.stringify(createPong()) } as never);
  t.is(rs.isPingPongGood(), true);
});

test('handle subscription error from connection', async (t) => {
  const channel = 'test';
  let counter = 0;
  const rs = getMockedRootSocket({}, (m: string) => {
    t.is(m.includes(channel), true);
    counter += 1;
  });
  await rs.connect();

  const sendSubscriptionError = () =>
    rs.onMessageReceive({
      data: JSON.stringify({
        event: ERROR,
        data: { detail: SUBSCRIPTION_ERROR_DETAIL, where: channel },
      }),
    } as never);

  const subscribeChannel = async () =>
    await rs.subscribe(channel, () => {
      // this should never be called
      t.is(false, true);
    });
  await subscribeChannel();

  t.is(rs.getSubscriptions().length, 1);
  sendSubscriptionError();
  t.is(rs.getSubscriptions().length, 0);
  t.is(counter, 1);

  counter = 0;
  subscribeChannel();
  subscribeChannel();
  // there are multiple handlers but only 1 channel
  t.is(rs.getSubscriptions().length, 1);
  sendSubscriptionError();
  t.is(rs.getSubscriptions().length, 0);
  t.is(counter, 2);
});

test('handle subscriptions', async (t) => {
  const channel = 'test';
  const channelMessage = 'testing message';
  const rs = getMockedRootSocket({}, (m: string) => {
    t.is(m.includes(channel), true);
  });
  await rs.connect();

  const receiveMessage = () =>
    rs.onMessageReceive({
      data: JSON.stringify(createChannelMessage(channel, channelMessage)),
    } as never);

  // test with no handlers first, shouldn't crash
  receiveMessage();

  let counter = 0;
  await rs.subscribe(channel, (d: string) => {
    t.is(d, channelMessage);
    counter += 1;
  });
  t.is(rs.getSubscriptions().length, 1);

  // with one function it should work
  receiveMessage();
  t.is(counter, 1);

  await rs.subscribe(channel, (d: string) => {
    t.is(d, channelMessage);
    counter += 1;
  });

  counter = 0;
  // should send to both functions
  receiveMessage();
  t.is(counter, 2);

  counter = 0;
  await rs.unsubscribeAll(channel);
  t.is(rs.getSubscriptions().length, 0);
  receiveMessage();
  t.is(counter, 0);

  // the following lines will test unsubscribe channel individually
  const subFunc = () => 'test';
  rs.subscribe(channel, subFunc);
  t.is(rs.getSubscriptions().length, 1);
  rs.unsubscribe(channel, subFunc);
  t.is(rs.getSubscriptions().length, 0);

  // TODO: test subscription with channel authorization
});
