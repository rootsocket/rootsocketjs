import {
  ERROR,
  isError,
  isPing,
  isPong,
  messageToString,
  PING,
  PONG,
  stringToMessage,
  SUBSCRIPTION_ADD,
  SUBSCRIPTION_REMOVE,
} from './lib/message';
import { RootSocket } from './lib/rootsocket';

export {
  isPing,
  isPong,
  isError,
  stringToMessage,
  messageToString,
  PING,
  PONG,
  ERROR,
  SUBSCRIPTION_ADD,
  SUBSCRIPTION_REMOVE,
};
export default RootSocket;
