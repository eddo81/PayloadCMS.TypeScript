import { ErrorResultDTO } from './models/errors/ErrorResultDTO.js';

/**
 * A structured error thrown on failed Payload CMS requests.
 *
 * Captures the HTTP status code, the originating `Response`,
 * the raw response body, and a typed list of error entries
 * parsed from that body.
 *
 * Thrown by {@link PayloadSDK} on non-2xx responses.
 */
export class PayloadError extends Error {
  public readonly statusCode: number;
  public readonly response: Response | undefined;

  /**
   * The raw unparsed JSON response body, if available.
   * Use this as an escape hatch to access undocumented or unrecognized top-level fields.
   */
  public readonly body: string | undefined;

  /**
   * The server-side stack trace, if present.
   * Payload includes this only in development mode via `ErrorResult.stack`.
   */
  public readonly serverStack: string | undefined;

  /**
   * The parsed error entries from `errors[]` in the response body.
   * Each entry exposes the base fields Payload guarantees across all error types
   * (`name`, `message`, `field`), plus a `json` escape hatch for richer types
   * such as `ValidationError`.
   */
  public readonly result: ErrorResultDTO[];

  constructor(options: {
    statusCode: number;
    response?: Response;
    body?: string;
  }) {
    super(`[PayloadError] Request failed with status: ${options.statusCode}`);

    this.name = 'PayloadError';
    this.statusCode = options.statusCode;
    this.response = options.response;
    this.body = options.body;

    let json: Record<string, unknown> | undefined;

    if (options.body !== undefined) {
      try {
        const parsed: unknown = JSON.parse(options.body);

        if (typeof parsed === 'object' && parsed !== null) {
          json = parsed as Record<string, unknown>;
        }
      }
      catch {
        // Non-JSON body — leave json undefined, result will be empty
      }
    }

    if (json !== undefined && typeof json['stack'] === 'string') {
      this.serverStack = json['stack'];
    }

    const result: ErrorResultDTO[] = [];

    if (json !== undefined && Array.isArray(json['errors'])) {
      for (const item of json['errors']) {
        if (typeof item !== 'object' || item === null) {
          continue;
        }

        result.push(ErrorResultDTO.fromJson(item as Record<string, unknown>));
      }
    }

    this.result = result;

    Object.setPrototypeOf(this, PayloadError.prototype);
  }
}
