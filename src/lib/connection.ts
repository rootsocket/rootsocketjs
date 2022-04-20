/**
 * retrieveConnectionTokenCallback creates a function that will retrieve a token from an url.
 * This function is used to retrieve a token before a connection is established.
 *
 * ### Example (es module)
 * ```js
 * const retrieveTokenFunc = retrieveConnectionTokenCallback('https://example.com/')
 * const token = retrieveTokenFunc()
 * ```
 *
 * @param url - An url string
 * @param options - RequestInit options for request
 * @param fetcher - A function that can fetch resources
 * @returns - A Promise-based string with a token or undefined
 * @throws - It will throw an exception if request is not correct
 */
export const retrieveConnectionTokenCallback = (
  url: string,
  /* istanbul ignore next */
  fetcher: (url: string, options?: RequestInit) => Promise<Response>,
  options?: RequestInit
): (() => Promise<string>) => {
  return async () => {
    const response = await fetcher(url, { method: 'POST', ...options });
    const data = await response.json();
    return data.token;
  };
};

/**
 * retrieveChannelTokenCallback creates a function that will retrieve a token from an url.
 * This function is used to retrieve a token that will authenticate subscriptions
 * to channels.
 *
 * ### Example (es module)
 * ```js
 * const retrieveTokenFunc = retrieveChannelTokenCallback('https://example.com/')
 * const token = retrieveTokenFunc()
 * ```
 *
 * @param url - An url string
 * @param options - RequestInit options for request
 * @param fetcher - A function that can fetch resources
 * @returns - A Promise-based string with a token or undefined
 * @throws - It will throw an exception if request is not correct
 */
export const retrieveChannelTokenCallback = (
  url: string,
  /* istanbul ignore next */
  fetcher: (url: string, options?: RequestInit) => Promise<Response>,
  options?: RequestInit
): (() => Promise<string>) => {
  return async () => {
    const response = await fetcher(url, { method: 'POST', ...options });
    const data = await response.json();
    return data.token;
  };
};
