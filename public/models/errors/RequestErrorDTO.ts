/**
 * Represents one entry in the `errors[]` array from a failed Payload CMS response.
 *
 * Payload's error response shape is intentionally dynamic — only `name`, `message`, and `field`
 * are guaranteed across all error types. The `json` property gives access to the full
 * raw entry, including the `data` block present on `ValidationError` and `APIError`
 * responses, which consumers can inspect and map to their own types.
 */
export class RequestErrorDTO {
  /**
   * The full raw JSON for this `errors[n]` entry.
   */
  public readonly json: Record<string, unknown>;

  /**
   * The error class name, if present (e.g. `"ValidationError"`, `"Forbidden"`).
   * Sourced from `errors[n].name`.
   */
  public readonly name: string | undefined;

  /**
   * The human-readable error message.
   * Sourced from `errors[n].message`.
   */
  public readonly message: string | undefined;

  /**
   * The field path associated with the error, if present.
   * Sourced from `errors[n].field` — set on Mongoose validation items only.
   */
  public readonly field: string | undefined;

  private constructor(options: {
    json: Record<string, unknown>;
    name?: string;
    message?: string;
    field?: string;
  }) {
    this.json = options.json;
    this.name = options.name;
    this.message = options.message;
    this.field = options.field;
  }

  /**
   * Creates a {@link RequestErrorDTO} from a single `errors[n]` item.
   *
   * @param json One entry from `errors[]` in a failed Payload CMS response.
   */
  static fromJson(json: Record<string, unknown>): RequestErrorDTO {
    const name = typeof json['name'] === 'string' ? json['name'] : undefined;
    const message = typeof json['message'] === 'string' ? json['message'] : undefined;
    const field = typeof json['field'] === 'string' ? json['field'] : undefined;

    return new RequestErrorDTO({ json, name, message, field });
  }
}
