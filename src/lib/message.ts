export const PING = 'ping';
export const PONG = 'pong';
export const SUBSCRIPTION_ADD = 'subscription-add';
export const SUBSCRIPTION_REMOVE = 'subscription-remove';
export const ERROR = 'error';
export const SUBSCRIPTION_ERROR_DETAIL = 'cannot subscribe';

export interface Data {
  detail?: string;
  where?: string;
  channel?: string;
  raw?: string;
  connection?: string;
  auth?: string;
}

export interface Message {
  event: string;
  data?: Data;
}

/**
 * messageToString converts a message to string
 *
 * ### Example (es module)
 * ```js
 * messageToString(m)
 * ```
 *
 * @param m - A message
 * @returns - A string
 */
export const messageToString = (m: Message): string => {
  return JSON.stringify(m);
};

/**
 * stringToMessage converts a string to message
 *
 * ### Example (es module)
 * ```js
 * stringToMessage(m)
 * ```
 *
 * @param - A string
 * @returns - A message
 */
export const stringToMessage = (s: string): Message => {
  return JSON.parse(s);
};

/**
 * createPing creates a ping message
 *
 * ### Example (es module)
 * ```js
 * createPing()
 * ```
 *
 * @returns - A message
 */
export const createPing = (): Message => {
  return { event: PING };
};

/**
 * createPong creates a pong message
 *
 * ### Example (es module)
 * ```js
 * createPong()
 * ```
 *
 * @returns - A message
 */
export const createPong = (): Message => {
  return { event: PONG };
};

/**
 * createSubscriptionAdd creates a subscription message
 * for a channel with or without authentication
 *
 * ### Example (es module)
 * ```js
 * createSubscriptionAdd(channel, authToken)
 * ```
 * @param channel - A string
 * @param auth - A string
 * @returns - A message
 */
export const createSubscriptionAdd = (
  channel: string,
  auth?: string
): Message => {
  return { event: SUBSCRIPTION_ADD, data: { channel, auth } };
};

/**
 * createSubscriptionRemove creates a unsubscribe message
 *
 * ### Example (es module)
 * ```js
 * createSubscriptionRemove(channel)
 * ```
 * @param channel - A string
 * @returns - A message
 */
export const createSubscriptionRemove = (channel: string): Message => {
  return { event: SUBSCRIPTION_REMOVE, data: { channel } };
};

/**
 * createChannelMessage creates a unsubscribe message
 *
 * ### Example (es module)
 * ```js
 * createChannelMessage(channel, data)
 * ```
 * @param channel - A string
 * @param data - A data object
 * @returns - A message
 */
export const createChannelMessage = (channel: string, raw: string) => {
  return { event: channel, data: { raw } };
};

/**
 * isPing checks if a message is a ping
 *
 * ### Example (es module)
 * ```js
 * isPing(m)
 * ```
 * @param m - A message
 * @returns - A boolean
 */
export const isPing = (m: Message) => {
  return m.event === PING;
};

/**
 * isPong checks if a message is a pong
 *
 * ### Example (es module)
 * ```js
 * isPong(m)
 * ```
 * @param m - A message
 * @returns - A boolean
 */
export const isPong = (m: Message) => {
  return m.event === PONG;
};

/**
 * isError checks if a message is an error
 *
 * ### Example (es module)
 * ```js
 * isError(m)
 * ```
 * @param m - A message
 * @returns - A boolean
 */
export const isError = (m: Message) => {
  return m.event === ERROR;
};

/**
 * isSubscriptionError checks if the message is a subscription error
 *
 * ### Example (es module)
 * ```js
 * isSubscriptionError(m)
 * ```
 * @param m - A message
 * @returns - A boolean
 */
export const isSubscriptionError = (m: Message) => {
  return m.data?.detail?.includes(SUBSCRIPTION_ERROR_DETAIL) ?? false;
};
