import type { HttpMethod } from "../enums/HttpMethod.js";
import type { Json } from "../../types/Json.js";
import type { QueryBuilder } from "../query/QueryBuilder.js";

/**
 * Options object for {@link PayloadSDK.request}.
 *
 * Mirrors the `RequestConfig` options contract shared across all ports.
 */
export type RequestConfig = {
  method: HttpMethod;
  path: string;
  body?: Json;
  query?: QueryBuilder;
};
