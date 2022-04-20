export const NotConnected = new Error(
  'not connected, did you forget to call connect?'
);
export const NotAllowedChannelSubscription = new Error(
  'not allowed to subscribe, login with your account and change it'
);
export const NotAllowedSend = new Error(
  'not allowed to send, login with your account and change it'
);
export const ChannelNoHandler = new Error(
  'received message for channel but there are no handlers'
);
