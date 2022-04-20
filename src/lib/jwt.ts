import { base64decode } from './base64';

export interface DecodedConnectionToken {
  allowClientSend: boolean;
  allowChannelSubscription: boolean;
  allowChannelAuthorization: boolean;
  exp: number;
}

/**
 * decodePayload decodes a JWT to an object, doesn't verify
 * that the token is correct
 *
 * ### Example (es module)
 * ```js
 * decodePayload('<jwt>')
 * ```
 *
 * @param raw - A JWT string
 * @returns - A base64 encoded string
 */
const decodePayload = (raw: string): Record<string, unknown> => {
  switch (raw.length % 4) {
    case 0:
      break;
    case 2:
      raw += '==';
      break;
    case 3:
      raw += '=';
      break;
    default:
      throw new Error('bad string');
  }
  try {
    return JSON.parse(base64decode(raw));
  } catch {
    return null;
  }
};

/**
 * decodeJWT decodes a jwt string to an object after replacing
 * unnecessary symbols
 *
 * ### Example (es module)
 * ```js
 * decodeJWT('<jwt>')
 * ```
 *
 * @param token - A JWT string
 * @returns - An object
 */
const decodeJWT = (token: string): Record<string, unknown> | null => {
  try {
    return decodePayload(
      token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    );
  } catch {
    return null;
  }
};

/**
 * decodeConnectionJWT decodes jwt string used for connection auth
 *
 * ### Example (es module)
 * ```js
 * decodeConnectionJWT('<jwt>')
 * ```
 *
 * @param token - A JWT string
 * @returns - An object
 */
export const decodeConnectionJWT = (token: string): DecodedConnectionToken => {
  return decodeJWT(token) as never;
};
