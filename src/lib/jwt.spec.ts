import test from 'ava';

import { decodeConnectionJWT } from './jwt';

test('decode connection jwt', (t) => {
  const token =
    'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NDk5NTg5NzEsImFwcGxpY2F0aW9uSWRlbnRpZmllciI6IjdmYTk3YzgzMDA3ZjRlOTc2ZGY3MWNhMjE5ZGU0OWFjIiwiaWQiOiI0OGM3M2FkOWRhZmY0MDc4NzljMjI5NzVjYzY0NDM4NiIsImFsbG93Q2xpZW50U2VuZCI6dHJ1ZSwiYWxsb3dDbGllbnREYXRhIjp0cnVlLCJhbGxvd0NoYW5uZWxTdWJzY3JpcHRpb24iOnRydWUsImFsbG93Q2hhbm5lbEF1dGhvcml6YXRpb24iOmZhbHNlLCJjYXRlZ29yeSI6ImNvbm5lY3QifQ.5XblN8TKtBXo0_1vd6wHmCpQB2r7dFNVDJBADpNSfp2khMce_E4M7mzl2qKI-ai_43TxlUxWW1Xo6TtnCD7HdQ';
  const decodedToken = decodeConnectionJWT(token);
  t.is(decodedToken.allowChannelAuthorization, false);
  t.is(decodedToken.allowClientSend, true);
  t.is(decodedToken.allowChannelSubscription, true);
});

test('decode bad connection jwt', (t) => {
  ['t', 'bad', null, undefined, 0].forEach((i: unknown) => {
    const decodedToken = decodeConnectionJWT(i as string);
    t.is(decodedToken, null);
  });
});
