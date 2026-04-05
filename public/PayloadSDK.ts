import { PaginatedDocsDTO } from "./models/collection/PaginatedDocsDTO.js";
import { DocumentDTO } from "./models/collection/DocumentDTO.js";
import { TotalDocsDTO } from "./models/collection/TotalDocsDTO.js";
import { LoginResultDTO } from "./models/auth/LoginResultDTO.js";
import { MeResultDTO } from "./models/auth/MeResultDTO.js";
import { RefreshResultDTO } from "./models/auth/RefreshResultDTO.js";
import { ResetPasswordResultDTO } from "./models/auth/ResetPasswordResultDTO.js";
import { MessageDTO } from "./models/auth/MessageDTO.js";
import { PayloadError } from "./PayloadError.js";
import { QueryBuilder } from "./query/QueryBuilder.js";
import { QueryStringEncoder } from "../internal/utils/QueryStringEncoder.js";
import { ApiKeyAuth } from "./config/ApiKeyAuth.js";
import { JwtAuth } from "./config/JwtAuth.js";
import type { Json } from "../types/Json.js";
import { FileUpload } from "./upload/FileUpload.js";
import { FormDataBuilder } from "../internal/upload/FormDataBuilder.js";
import { HttpMethod } from "./enums/HttpMethod.js";
import type { IAuthCredential } from "../internal/contracts/IAuthCredential.js";
import { JsonParser } from "../internal/utils/JsonParser.js";
import type { RequestConfig } from "./config/RequestConfig.js";

/**
 * HTTP client for the Payload CMS REST API.
 *
 * Provides typed methods for `collections`, `globals`,
 * `auth`, `versions`, and file uploads.
 */
export class PayloadSDK {
  private _baseUrl: string;
  private _headers: Record<string, string> = {};
  private _auth: IAuthCredential | undefined = undefined;
  private _encoder: QueryStringEncoder = new QueryStringEncoder();

  constructor(options: { baseUrl: string }) {
    const { baseUrl } = options;

    this._baseUrl = this._normalizeUrl({ url: baseUrl });
  }

 /**
  * Validates and normalizes a base URL string.
  *
  * Strips trailing slashes to prevent double-slash
  * paths when building endpoint URLs.
  *
  * @param {string} options.url - The raw base URL to normalize.
  *
  * @returns {string} The normalized URL without a trailing slash.
  *
  * @throws {Error} If the URL is malformed.
  */
  private _normalizeUrl(options: { url: string }): string {
    const { url } = options;

    try {
      const urlString = new URL(url).toString();
      const normalized = urlString.replace(/\/+$/, '');

      return normalized;
    }
    catch (error) {
      throw new Error(`[PayloadError] Invalid base URL: ${url}`, { cause: error });
    }
  }

 /**
  * Sets the custom headers to include with every request.
  *
  * These are merged with the default `Accept` and
  * `Content-Type` headers at request time.
  *
  * @param {Record<string, string>} options.headers - The custom headers to set.
  *
  * @returns {void}
  */
  public setHeaders(options: { headers: Record<string, string> }): void {
    const { headers } = options;

    this._headers = headers;
  }

 /**
  * Sets an API key credential for all subsequent requests.
  *
  * @param {ApiKeyAuth} options.auth - The {@link ApiKeyAuth} credential to use.
  *
  * @returns {void}
  */
  public setApiKeyAuth(options: { auth: ApiKeyAuth }): void {
    const { auth } = options;

    this._auth = auth;
  }

 /**
  * Sets a JWT bearer token credential for all subsequent requests.
  *
  * @param {JwtAuth} options.auth - The {@link JwtAuth} credential to use.
  *
  * @returns {void}
  */
  public setJwtAuth(options: { auth: JwtAuth }): void {
    const { auth } = options;

    this._auth = auth;
  }

 /**
  * Clears the current authentication credential.
  *
  * Subsequent requests will be sent without authorization headers.
  *
  * @returns {void}
  */
  public clearAuth(): void {
    this._auth = undefined;
  }

 /**
  * Sends a raw HTTP request through the client pipeline.
  *
  * An escape hatch for `Payload CMS` custom endpoints.
  * Uses the same headers, auth, and error handling
  * but returns raw JSON instead of a DTO.
  *
  * @param {RequestConfig} config - The request configuration.
  * @param {AbortSignal} [signal] - Optional abort signal for cancellation.
  *
  * @returns {Promise<Json | undefined>} The parsed JSON response, or `undefined` for empty bodies.
  */
  async request(config: RequestConfig, signal?: AbortSignal): Promise<Json | undefined> {
    const { method, path, body, query } = config;
    const url = this._appendQueryString({ url: `${this._baseUrl}${path}`, query });

    const requestInit: RequestInit = { method };

    if (body !== undefined) {
      requestInit.body = JsonParser.stringify(body);
    }

    return this._request({ url, config: requestInit, signal });
  }

 /**
  * Appends a serialized query string to the given URL.
  *
  * Encodes the {@link QueryBuilder} parameters via
  * {@link QueryStringEncoder} and appends them.
  *
  * @param {string} options.url - The base URL to append query parameters to.
  * @param {QueryBuilder | undefined} options.query - Optional query parameters.
  *
  * @returns {string} The URL with an appended query string, if applicable.
  */
  private _appendQueryString(options: { url: string; query?: QueryBuilder }): string {
    const { url, query } = options;

    if(query === undefined) {
      return url;
    }

    const params = query.build();
    const queryString = this._encoder.stringify({ obj: params });

    return `${url}${queryString}`;
  }

 /**
  * Executes an HTTP request and returns parsed JSON.
  *
  * Merges default headers, applies auth, parses the
  * response body, and normalizes errors into
  * {@link PayloadError} instances.
  *
  * @param {string} options.url - Fully resolved request URL.
  * @param {RequestInit} options.config - Optional `fetch` configuration overrides.
  * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
  *
  * @returns {Promise<Json | undefined>} Parsed JSON, or `undefined` for empty responses.
  *
  * @throws {PayloadError} On non-2xx responses.
  * @throws {Error} On network, parsing, or abort failures.
  */
  private async _request(options: { url: string; config?: RequestInit; signal?: AbortSignal }): Promise<Json | undefined> {
    const { url, config = {}, signal } = options;

    let response: Response;
    let text: string;
    let json: Json | undefined = undefined;
    let defaultMethod: HttpMethod = HttpMethod.GET;

    let headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...this._headers,
    };

    if (config.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    if (this._auth) {
      this._auth.apply({ headers });
    }

    try {
      response = await fetch(url, {
        method: defaultMethod,
        ...config,
        headers: headers,
        signal: signal,
      });

      text = await response.text();

      if (!response.ok) {
        throw new PayloadError({
          statusCode: response.status,
          response,
          body: text.length > 0 ? text : undefined,
        });
      }

      json = JsonParser.parse(text);

      return json;
    }
    catch (error: any) {
      let message: string = '[PayloadError] Request failed';

      if (error instanceof SyntaxError) {
        message = `[PayloadError] Failed to parse JSON response`;
      }
      else if (error instanceof TypeError) {
        message = `[PayloadError] Network failure or CORS issue`;
      }
      else if (error.name === 'AbortError') {
        message = `[PayloadError] Request was aborted or timed out`;
      }
      else if (error instanceof PayloadError) {
        throw error;
      }
      else if (error instanceof Error) {
        message = `[PayloadError] ${error.message}`;
      }

      throw new Error(message, { cause: error });
    }
  }

  /**
   * Retrieves a paginated list of documents from a `collection`.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {QueryBuilder} [options.query] - Optional {@link QueryBuilder} for filtering, sorting, pagination.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<PaginatedDocsDTO>} A paginated response containing matching documents.
   */
  async find(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO> {
    const { slug, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}`, query });
    const json = await this._request({ url, signal }) ?? {};
    const dto = PaginatedDocsDTO.fromJson(json);

    return dto;
  }

  /**
   * Retrieves a single document by its ID.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {string} options.id - The document ID.
   * @param {QueryBuilder} [options.query] - Optional {@link QueryBuilder} for depth, locale, etc.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The requested document.
   */
  async findById(options: { slug: string; id: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`, query });
    const json = await this._request({ url, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json);

    return dto;
  }

  /**
   * Creates a new document in a `collection`.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {Json} options.data - The document data to create.
   * @param {FileUpload} [options.file] - Optional file for `upload`-enabled collections.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The created document.
   */
  async create(options: { slug: string; data: Json; file?: FileUpload; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, data, file, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: file !== undefined ? FormDataBuilder.build({ file, data }) : JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json['doc'] as Json ?? {});

    return dto;
  }

  /**
   * Deletes multiple documents matching a query.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {QueryBuilder} options.query - {@link QueryBuilder} with `where` clause to select documents.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<PaginatedDocsDTO>} The bulk result containing deleted documents.
   */
  async delete(options: { slug: string; query: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO> {
    const { slug, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}`, query });
    const method: HttpMethod = HttpMethod.DELETE;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = PaginatedDocsDTO.fromJson(json);

    return dto;
  }

  /**
   * Deletes a single document by its ID.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {string} options.id - The document ID.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The deleted document.
   */
  async deleteById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
    const method: HttpMethod = HttpMethod.DELETE;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json['doc'] as Json ?? {});

    return dto;
  }

  /**
   * Updates multiple documents matching a query.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {Json} options.data - The fields to update on matching documents.
   * @param {QueryBuilder} options.query - {@link QueryBuilder} with `where` clause to select documents.
   * @param {FileUpload} [options.file] - Optional file for `upload`-enabled collections.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<PaginatedDocsDTO>} The bulk result containing updated documents.
   */
  async update(options: { slug: string; data: Json; query: QueryBuilder; file?: FileUpload; signal?: AbortSignal }): Promise<PaginatedDocsDTO> {
    const { slug, data, query, file, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}`, query });
    const method: HttpMethod = HttpMethod.PATCH;

    const config: RequestInit = {
      method: method,
      body: file !== undefined ? FormDataBuilder.build({ file, data }) : JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = PaginatedDocsDTO.fromJson(json);

    return dto;
  }

  /**
   * Updates a single document by its ID.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {string} options.id - The document ID.
   * @param {Json} options.data - The fields to update.
   * @param {FileUpload} [options.file] - Optional file for `upload`-enabled collections.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The updated document.
   */
  async updateById(options: { slug: string; id: string; data: Json; file?: FileUpload; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, data, file, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
    const method: HttpMethod = HttpMethod.PATCH;

    const config: RequestInit = {
      method: method,
      body: file !== undefined ? FormDataBuilder.build({ file, data }) : JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json['doc'] as Json ?? {});

    return dto;
  }

  /**
   * Retrieves the total document count for a `collection`.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {QueryBuilder} [options.query] - Optional {@link QueryBuilder} for filtering.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<number>} The total document count.
   */
  async count(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<number> {
    const { slug, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}/count`, query });
    const json = await this._request({ url, signal }) ?? {};
    const dto = TotalDocsDTO.fromJson(json);

    return dto.totalDocs;
  }

  /**
   * Retrieves a `global` document.
   *
   * @param {string} options.slug - The `global` slug.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The `global` document.
   */
  async findGlobal(options: { slug: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, signal } = options;
    const url = `${this._baseUrl}/api/globals/${encodeURIComponent(slug)}`;
    const json = await this._request({ url, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json);

    return dto;
  }

  /**
   * Updates a `global` document.
   *
   * @param {string} options.slug - The `global` slug.
   * @param {Json} options.data - The fields to update.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The updated `global` document.
   */
  async updateGlobal(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, data, signal } = options;
    const url = `${this._baseUrl}/api/globals/${encodeURIComponent(slug)}`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json['result'] as Json ?? {});

    return dto;
  }

  /**
   * Retrieves a paginated list of `versions` for a `collection`.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {QueryBuilder} [options.query] - Optional {@link QueryBuilder} for filtering, sorting, pagination.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<PaginatedDocsDTO>} A paginated response containing `version` documents.
   */
  async findVersions(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO> {
    const { slug, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/${encodeURIComponent(slug)}/versions`, query });
    const json = await this._request({ url, signal }) ?? {};
    const dto = PaginatedDocsDTO.fromJson(json);

    return dto;
  }

  /**
   * Retrieves a single `version` document by its ID.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {string} options.id - The `version` ID.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The `version` document.
   */
  async findVersionById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/versions/${encodeURIComponent(id)}`;
    const json = await this._request({ url, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json);

    return dto;
  }

  /**
   * Restores a `collection` document to a specific `version`.
   *
   * @param {string} options.slug - The `collection` slug.
   * @param {string} options.id - The `version` ID to restore.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The restored document.
   */
  async restoreVersion(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/versions/${encodeURIComponent(id)}`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json);

    return dto;
  }

  /**
   * Retrieves a paginated list of `versions` for a `global`.
   *
   * @param {string} options.slug - The `global` slug.
   * @param {QueryBuilder} [options.query] - Optional {@link QueryBuilder} for filtering, sorting, pagination.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<PaginatedDocsDTO>} A paginated response containing `version` documents.
   */
  async findGlobalVersions(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO> {
    const { slug, query, signal } = options;
    const url = this._appendQueryString({ url: `${this._baseUrl}/api/globals/${encodeURIComponent(slug)}/versions`, query });
    const json = await this._request({ url, signal }) ?? {};
    const dto = PaginatedDocsDTO.fromJson(json);

    return dto;
  }

  /**
   * Retrieves a single `global` `version` document by its ID.
   *
   * @param {string} options.slug - The `global` slug.
   * @param {string} options.id - The `version` ID.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The `version` document.
   */
  async findGlobalVersionById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, signal } = options;
    const url = `${this._baseUrl}/api/globals/${encodeURIComponent(slug)}/versions/${encodeURIComponent(id)}`;
    const json = await this._request({ url, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json);

    return dto;
  }

  /**
   * Restores a `global` document to a specific `version`.
   *
   * @param {string} options.slug - The `global` slug.
   * @param {string} options.id - The `version` ID to restore.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<DocumentDTO>} The restored document.
   */
  async restoreGlobalVersion(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO> {
    const { slug, id, signal } = options;
    const url = `${this._baseUrl}/api/globals/${encodeURIComponent(slug)}/versions/${encodeURIComponent(id)}`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = DocumentDTO.fromJson(json['doc'] as Json ?? {});

    return dto;
  }

  /**
   * Authenticates a user and returns a JWT token.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {Json} options.data - The login credentials (e.g. `{ email, password }`).
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<LoginResultDTO>} The login result containing token, expiration, and user.
   */
  async login(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<LoginResultDTO> {
    const { slug, data, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/login`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = LoginResultDTO.fromJson(json);

    return dto;
  }

  /**
   * Retrieves the currently authenticated user.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<MeResultDTO>} The current user with token and session metadata.
   */
  async me(options: { slug: string; signal?: AbortSignal }): Promise<MeResultDTO> {
    const { slug, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/me`;
    const json = await this._request({ url, signal }) ?? {};
    const dto = MeResultDTO.fromJson(json);

    return dto;
  }

  /**
   * Refreshes the current JWT token.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<RefreshResultDTO>} The new token, expiration, and user.
   */
  async refreshToken(options: { slug: string; signal?: AbortSignal }): Promise<RefreshResultDTO> {
    const { slug, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/refresh-token`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = RefreshResultDTO.fromJson(json);

    return dto;
  }

  /**
   * Initiates the forgot-password flow.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {Json} options.data - The request data (e.g. `{ email }`).
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<MessageDTO>} A message confirming the request was processed.
   */
  async forgotPassword(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<MessageDTO> {
    const { slug, data, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/forgot-password`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = MessageDTO.fromJson(json);

    return dto;
  }

  /**
   * Completes a password reset using a reset token.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {Json} options.data - The reset data (e.g. `{ token, password }`).
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<ResetPasswordResultDTO>} The user document and optional new token.
   */
  async resetPassword(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<ResetPasswordResultDTO> {
    const { slug, data, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/reset-password`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = ResetPasswordResultDTO.fromJson(json);

    return dto;
  }

  /**
   * Verifies a user's email address using a verification token.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {string} options.token - The email verification token.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<MessageDTO>} A message confirming the verification result.
   */
  async verifyEmail(options: { slug: string; token: string; signal?: AbortSignal }): Promise<MessageDTO> {
    const { slug, token, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/verify/${encodeURIComponent(token)}`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = MessageDTO.fromJson(json);

    return dto;
  }

  /**
   * Logs out the currently authenticated user.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<MessageDTO>} A message confirming the logout.
   */
  async logout(options: { slug: string; signal?: AbortSignal }): Promise<MessageDTO> {
    const { slug, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/logout`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = MessageDTO.fromJson(json);

    return dto;
  }

  /**
   * Unlocks a user account locked by failed login attempts.
   *
   * @param {string} options.slug - The `auth`-enabled `collection` slug.
   * @param {Json} options.data - The request data (e.g. `{ email }`).
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation.
   *
   * @returns {Promise<MessageDTO>} A message confirming the unlock.
   */
  async unlock(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<MessageDTO> {
    const { slug, data, signal } = options;
    const url = `${this._baseUrl}/api/${encodeURIComponent(slug)}/unlock`;
    const method: HttpMethod = HttpMethod.POST;

    const config: RequestInit = {
      method: method,
      body: JsonParser.stringify(data),
    };

    const json = await this._request({ url, config, signal }) ?? {};
    const dto = MessageDTO.fromJson(json);

    return dto;
  }
}
