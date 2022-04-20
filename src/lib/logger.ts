/**
 * log will attempt to console.log a message and the given details
 *
 * ### Example (es module)
 * ```js
 * log('Hello log', {err: 'not allowed'})
 * ```
 *
 * @param message - A string with a message
 * @param details - An object with details about the log
 */
export const log = async (
  message: string,
  details?: unknown,
  /* istanbul ignore next */
  logger = console.log
) => {
  logger({ detail: message, more: details });
};
