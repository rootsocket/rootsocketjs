import {
  retrieveChannelTokenCallback,
  retrieveConnectionTokenCallback,
} from './connection';
import {
  ChannelNoHandler,
  NotAllowedChannelSubscription,
  NotAllowedSend,
  NotConnected,
  NotSubscribed,
} from './errors';
import { decodeConnectionJWT, DecodedConnectionToken } from './jwt';
import { log } from './logger';
import {
  createChannelMessage,
  createPing,
  createPong,
  createSubscriptionAdd,
  createSubscriptionRemove,
  isError,
  isPing,
  isPong,
  isSubscriptionError,
  Message,
  messageToString,
  stringToMessage,
} from './message';

interface RootSocketConstructor {
  server: string;
  connectionUrl: string;
  channelUrl?: string;
  debug?: boolean;
  fetchOptions?: RequestInit;
  disableTLS?: boolean;
  webSocketClass?: WebSocket;
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
}

export class RootSocket {
  private webSocketClass = undefined;
  private pingPongIntervalMs = 1 * 60 * 1000;
  private pingPongTimeoutMs = 3 * 60 * 1000;
  private pingIntervalID = undefined;
  private lastPing = undefined;
  private disableTLS = false;
  private debug = false;
  private server: string = undefined;
  private connection: WebSocket = undefined;
  private channels: { [key: string]: Array<(data: string) => void> } = {};
  private decodedConnectionToken: DecodedConnectionToken = undefined;

  /**
   * onReconnect checks if the connection should try to connect again
   * you can use your own function to create a custom behavior
   *
   * ### Example (es module)
   * ```js
   * await onReconnect()
   * ```
   *
   * @returns - A boolean promise
   */
  onReconnect: () => Promise<boolean> = null;

  /**
   * onGenerateConnectionToken retrieves a token used to connect
   * to the WebSocket endpoint
   *
   * ### Example (es module)
   * ```js
   * await onGenerateConnectionToken()
   * ```
   *
   * @returns - A string promise
   */
  onGenerateConnectionToken: () => Promise<string> = null;

  /**
   * onGenerateChannelToken retrieves a token used to authenticate
   * channel subscriptions
   *
   * ### Example (es module)
   * ```js
   * await onGenerateChannelToken()
   * ```
   *
   * @returns - A string promise
   */
  onGenerateChannelToken: () => Promise<string> = null;

  /**
   * onRawError handles raw error message events
   *
   * ### Example (es module)
   * ```js
   * onRawError(ev)
   * ```
   *
   * @param ev - A MessageEvent
   */
  onRawError: (ev: MessageEvent) => void = null;

  /**
   * onRawReceive handles raw normal message events
   *
   * ### Example (es module)
   * ```js
   * onRawReceive(ev)
   * ```
   *
   * @param ev - A MessageEvent
   */
  onRawReceive: (ev: MessageEvent) => void = null;

  /**
   * onRawClose handles raw close event
   *
   * ### Example (es module)
   * ```js
   * onRawClose(ev)
   * ```
   *
   * @param ev - A MessageEvent
   */
  onRawClose: (ev: CloseEvent) => void = null;

  /**
   * onRawOpen handles raw open event
   *
   * ### Example (es module)
   * ```js
   * onRawOpen(ev)
   * ```
   *
   * @param ev - A MessageEvent
   */
  onRawOpen: (ev: MessageEvent) => void = null;

  constructor({
    server = 'rootsocket.com',
    debug = false,
    fetchOptions = {},
    disableTLS = false,
    fetcher = fetch,
    webSocketClass,
    connectionUrl,
    channelUrl,
  }: RootSocketConstructor) {
    this.debug = debug;
    this.server = server;
    this.disableTLS = disableTLS;
    this.onGenerateConnectionToken = retrieveConnectionTokenCallback(
      connectionUrl,
      fetcher,
      fetchOptions
    );
    this.onGenerateChannelToken = retrieveChannelTokenCallback(
      channelUrl,
      fetcher,
      fetchOptions
    );
    this.onReconnect = async () => true;

    this.onRawOpen = this.onMessageOpen;
    this.onRawClose = this.onMessageClose;
    this.onRawError = this.onMessageError;
    this.onRawReceive = this.onMessageReceive;

    this.webSocketClass = webSocketClass || WebSocket;
  }

  /**
   * retry will try to connect again with an exponential back-off
   * if onReconnect returns true
   *
   * ### Example (es module)
   * ```js
   * retry()
   * ```
   */
  private async retry(
    // retriesLeft = 10,
    // interval = 1000,
    // exponential = false
  ): Promise<void> {
    // try {
    //   if (!this.onReconnect()) {
    //     throw new Error('retry');
    //   }

    //   await this.connect();
    // } catch (error) {
    //   await new Promise((r) => setTimeout(r, interval));
    //   this.retry(
    //     retriesLeft - 1,
    //     exponential ? interval * 2 : interval,
    //     exponential
    //   );
    // }
  }

  /**
   * getConnectionUrl sets up the websocket connection url
   *
   * ### Example (es module)
   * ```js
   * getConnectionUrl(token)
   * ```
   *
   * @param token - A string
   */
  private getConnectionUrl(token: string): string {
    const scheme = this.disableTLS ? 'ws' : 'wss';
    return `${scheme}://${this.server}/api/v1/ws/${token}/`;
  }

  /**
   * handlePing sends a ping message to the server
   *
   * ### Example (es module)
   * ```js
   * handlePing()
   * ```
   *
   */
  private handlePing() {
    this.connection.send(messageToString(createPong()));
  }

  /**
   * handlePong sends a pong message to the server
   *
   * ### Example (es module)
   * ```js
   * handlePong()
   * ```
   *
   */
  private handlePong() {
    this.lastPing = new Date().getTime();
  }

  /**
   * handleSubscriptionError wll handle all subscriptions errors
   * by doing the necessary clean up.
   *
   * ### Example (es module)
   * ```js
   * handleSubscriptionError(m)
   * ```
   *
   * @param m - A Message
   */
  private handleSubscriptionError(m: Message) {
    const channel: string = m.data.where;
    if ((this.channels[channel] ?? []).length > 1) {
      // more than 1 subscription but we got this message back somehow, weird.
      // if its only one we don't need to try to unsubscribe because the connection never subscribed anyway
      this.unsubscribeAll(channel);
    } else {
      delete this.channels[channel];
    }
  }

  /**
   * handleMessage send messages to all handlers
   *
   * ### Example (es module)
   * ```js
   * handleMessage(m)
   * ```
   *
   * @param m - A Message
   */
  private handleMessage(m: Message) {
    const handlers = this.channels[m.event] ?? [];
    if (handlers.length === 0) {
      this.debug && log(ChannelNoHandler.message, { channel: m.event });
      return;
    }
    handlers.forEach((f) => f(m.data.raw));
  }

  /**
   * onConnectionClose does the proper cleanup after a connection is closed
   *
   * ### Example (es module)
   * ```js
   * onConnectionClose()
   * ```
   *
   * @returns - A boolean
   */
  private onConnectionClose() {
    this.pingIntervalID && clearInterval(this.pingIntervalID);
    this.retry();
  }

  /**
   * connect will disconnect previous connections and create a new one,
   * even if the method is awaited that doesn't guarantee that the
   * connection is open, isConnected should be used.
   *
   * ### Example (es module)
   * ```js
   * await connect()
   * ```
   *
   */
  async connect() {
    this.disconnect();
    const token = await this.onGenerateConnectionToken();
    this.decodedConnectionToken = decodeConnectionJWT(token);
    this.connection = new this.webSocketClass(this.getConnectionUrl(token));
    this.connection.onopen = this.onRawOpen;
    this.connection.onclose = this.onRawClose;
    this.connection.onerror = this.onRawError;
    this.connection.onmessage = this.onRawReceive;
  }

  /**
   * disconnect will close the current connection
   *
   * ### Example (es module)
   * ```js
   * disconnect()
   * ```
   *
   */
  disconnect() {
    this.connection && this.connection.close();
  }

  /**
   * isConnected indicates if the connection is active
   *
   * ### Example (es module)
   * ```js
   * isConnected()
   * ```
   *
   * @returns - A boolean
   */
  isConnected() {
    return (
      this.connection && this.connection.readyState === this.connection.OPEN
    );
  }

  /**
   * isConnecting indicates if the connection is connection
   *
   * ### Example (es module)
   * ```js
   * isConnecting()
   * ```
   *
   * @returns - A boolean
   */
  isConnecting() {
    return (
      this.connection &&
      this.connection.readyState === this.connection.CONNECTING
    );
  }

  /**
   * isClosed indicates if the connection is closed
   *
   * ### Example (es module)
   * ```js
   * isClosed()
   * ```
   *
   * @returns - A boolean
   */
  isClosed() {
    return !this.isConnected || !this.isConnecting;
  }

  isPingPongIntervalSet() {
    return !!this.pingIntervalID;
  }

  isPingPongGood() {
    const timeDiffMs = new Date().getTime() - this.lastPing;
    return timeDiffMs < this.pingPongTimeoutMs;
  }

  /**
   * onMessageOpen sets up ping interval and handles open messages
   *
   * ### Example (es module)
   * ```js
   * onMessageOpen()
   * ```
   *
   * @param ev - A MessageEvent
   */
  onMessageOpen = (ev: MessageEvent) => {
    this.debug && log('connecting', { data: ev.data });

    this.pingIntervalID = setInterval(() => {
      if (this.isPingPongGood()) {
        // Server didn't respond with a pong for some time, we need to reconnect
        // because something is wrong.
        this.disconnect();
      }
      this.connection.send(messageToString(createPing()));
    }, this.pingPongIntervalMs);
  };

  /**
   * onMessageClose does cleanup for a connection
   *
   * ### Example (es module)
   * ```js
   * onMessageClose()
   * ```
   *
   * @param ev - A MessageEvent
   */
  onMessageClose = (ev: CloseEvent) => {
    this.debug && log('closing', { data: ev });
    this.onConnectionClose();
  };

  /**
   * onMessageError handles error message events
   *
   * ### Example (es module)
   * ```js
   * onMessageError()
   * ```
   *
   * @param ev - A MessageEvent
   */
  onMessageError = (ev: MessageEvent) => {
    this.debug && log('disconnecting', { data: ev.data });
  };

  /**
   * onMessageReceive handles receive events as ping, pong and data messages
   *
   * ### Example (es module)
   * ```js
   * onMessageReceive()
   * ```
   *
   * @param ev - A MessageEvent
   */
  onMessageReceive = (ev: MessageEvent) => {
    this.debug && log('receiving', { data: ev.data });
    const msg = stringToMessage(ev.data);

    if (isPong(msg)) {
      this.handlePong();
    } else if (isPing(msg)) {
      this.handlePing();
    } else if (isError(msg)) {
      this.debug && log('received error', msg);
      if (isSubscriptionError(msg)) {
        this.handleSubscriptionError(msg);
      }
    } else {
      this.handleMessage(msg);
    }
  };

  /**
   * getSubscriptions returns all active subscriptions for current connection
   *
   * ### Example (es module)
   * ```js
   * getSubscriptions()
   * ```
   *
   * @returns - A list of strings
   */
  getSubscriptions() {
    return Object.keys(this.channels);
  }

  /**
   * canSendMessage returns if the current connection can send messages
   *
   * ### Example (es module)
   * ```js
   * canSendMessage()
   * ```
   *
   * @returns - A boolean
   */
  canSendMessage(): boolean {
    if (!this.isConnected()) {
      return false;
    }

    return true;
  }

  /**
   * subscribe will subscribe the connection to a channel
   *
   * ### Example (es module)
   * ```js
   * await subscribe(channel, dataFunc)
   * ```
   *
   * @param channel - A string
   * @param func - A data func message
   * @returns - A function promise
   */
  async subscribe(
    channel: string,
    func: (data: string) => void
  ): Promise<() => void> {
    if (!this.isConnected()) {
      throw NotConnected;
    }

    if (!this.decodedConnectionToken.allowChannelSubscription) {
      throw NotAllowedChannelSubscription;
    }

    let token = undefined;
    if (this.decodedConnectionToken.allowChannelAuthorization) {
      token = await this.onGenerateChannelToken();
    }

    let subs = this.channels[channel];
    if (!subs) {
      subs = [];
      this.connection.send(
        messageToString(createSubscriptionAdd(channel, token))
      );
    }

    subs.push(func);
    this.channels[channel] = subs;
    return () => {
      this.unsubscribe(channel, func);
    };
  }

  /**
   * unsubscribe will unsubscribe a function from a channel
   *
   * ### Example (es module)
   * ```js
   * await unsubscribe(channel, data)
   * ```
   *
   * @param channel - A string
   * @param func - A data func message
   */
  async unsubscribe(channel: string, func: (data: string) => void) {
    if (!this.isConnected()) {
      throw NotConnected;
    }

    const subs = this.channels[channel] ?? [];
    // this is the last sub, we can safely remove the subscription now
    if (subs.length === 1) {
      delete this.channels[channel];
      this.connection.send(messageToString(createSubscriptionRemove(channel)));
    } else {
      this.channels[channel] = subs.filter((i) => i !== func);
    }
  }

  /**
   * unsubscribeAll will unsubscribe the connection from a channel
   * removing every function
   *
   * ### Example (es module)
   * ```js
   * await unsubscribeAll(channel)
   * ```
   *
   * @param channel - A string
   * @param data - A data message
   */
  async unsubscribeAll(channel: string) {
    if (!this.isConnected()) {
      throw NotConnected;
    }

    this.connection.send(messageToString(createSubscriptionRemove(channel)));
    delete this.channels[channel];
  }

  /**
   * send sends a message to a channel
   * removing every function
   *
   * ### Example (es module)
   * ```js
   * await send(channel, data)
   * ```
   *
   * @param channel - A string
   * @param data - A data message
   */
  async send(channel: string, raw: unknown) {
    if (!this.decodedConnectionToken.allowClientSend) {
      this.debug && log(NotAllowedSend.message);
      return;
    }

    if (!this.channels[channel]) {
      this.debug && log(NotSubscribed.message);
      return;
    }

    // we can only deal with strings and objects, if the raw message is not a string
    // we should assume it is an object/array or throw an exception
    let message;
    if (typeof raw === 'string' || raw instanceof String) {
      message = createChannelMessage(channel, raw as string);
    } else {
      message = createChannelMessage(channel, JSON.stringify(raw));
    }

    this.connection.send(messageToString(message));
  }
}
