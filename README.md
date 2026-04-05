# Payload CMS HTTP Client

A lightweight, zero-dependency HTTP client for the [Payload CMS](https://payloadcms.com/) REST API built in TypeScript.

- Typed methods for collections, globals, auth, and versions
- Fluent query builder with where clauses, joins, sorting, and pagination
- File upload support via `FormData`
- API key and JWT authentication
- Custom endpoint escape hatch via `request()`
- No external dependencies

## Installation

```bash
npm install payload-cms-http-client
```

## Usage

```typescript
import { PayloadSDK } from 'payload-cms-http-client';

const client = new PayloadSDK({ baseUrl: 'http://localhost:3000' });
```

### Constructor

```typescript
new PayloadSDK(options: {
  baseUrl: string;
})
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `baseUrl` | `string` | Payload CMS instance URL. Trailing slashes are stripped automatically. |

### Set headers

Replaces custom headers included with every request.

```typescript
setHeaders(options: { headers: Record<string, string> }): void
```

### Set API key auth

Sets an API key credential for all subsequent requests.

```typescript
setApiKeyAuth(options: { auth: ApiKeyAuth }): void
```

### Set JWT auth

Sets a JWT bearer token credential for all subsequent requests.

```typescript
setJwtAuth(options: { auth: JwtAuth }): void
```

### Clear auth

Clears the current authentication credential. Subsequent requests are sent without authorization headers.

```typescript
clearAuth(): void
```

---

## Collections

### Find documents

Retrieves a paginated list of documents.

```typescript
async find(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `query` | `QueryBuilder` | Optional query parameters (where, sort, limit, etc.). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: PaginatedDocsDTO = await client.find({ slug: 'posts' });

// result.docs        — DocumentDTO[]
// result.totalDocs   — 42
// result.totalPages  — 5
// result.page        — 1
// result.limit       — 10
// result.hasNextPage — true
// result.hasPrevPage — false
```

### Find by ID

Retrieves a single document by ID.

```typescript
async findById(options: { slug: string; id: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `id` | `string` | Document ID. |
| `query` | `QueryBuilder` | Optional query parameters. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.findById({ slug: 'posts', id: '123' });

// document.id        — "123"
// document.json      — { id: '123', title: 'Hello World', ... }
// document.createdAt — Date | undefined
// document.updatedAt — Date | undefined
```

### Count

Returns the total count of documents matching an optional query.

```typescript
async count(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<number>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `query` | `QueryBuilder` | Optional query parameters to filter the count. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const total: number = await client.count({ slug: 'posts' });

// total — 42
```

### Create

Creates a new document. Supports file uploads on upload-enabled collections.

```typescript
async create(options: { slug: string; data: Json; file?: FileUpload; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `data` | `Json` | Document data. |
| `file` | `FileUpload` | Optional file to upload (for upload-enabled collections). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.create({
  slug: 'posts',
  data: { title: 'Hello World', content: 'My first post.' },
});

// document.id   — "abc123"
// document.json — { id: 'abc123', title: 'Hello World', content: 'My first post.', ... }
```

#### File Uploads

`FileUpload` constructor:

```typescript
new FileUpload(options: {
  content: Blob;
  filename: string;
  mimeType?: string;
})
```

| Property | Type | Description |
|----------|------|-------------|
| `content` | `Blob` | The file content. |
| `filename` | `string` | The filename (including extension). |
| `mimeType` | `string \| undefined` | Optional MIME type. When set, the `Blob` is created with this type. |

#### Example
```typescript
import { FileUpload } from 'payload-cms-http-client';

const file = new FileUpload({
  content: new Blob([imageBuffer]),
  filename: 'photo.png',
  mimeType: 'image/png',
});

const document: DocumentDTO = await client.create({
  slug: 'media',
  data: { alt: 'My image' },
  file: file,
});
```

### Update by ID

Updates a single document by ID. Supports file replacement.

```typescript
async updateById(options: { slug: string; id: string; data: Json; file?: FileUpload; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `id` | `string` | Document ID. |
| `data` | `Json` | Fields to update. |
| `file` | `FileUpload` | Optional replacement file. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.updateById({
  slug: 'posts',
  id: '123',
  data: { title: 'Updated Title' },
});
```

### Bulk update

Bulk-updates all documents matching a query. Supports file uploads.

```typescript
async update(options: { slug: string; data: Json; query: QueryBuilder; file?: FileUpload; signal?: AbortSignal }): Promise<PaginatedDocsDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `data` | `Json` | Fields to update on all matching documents. |
| `query` | `QueryBuilder` | Query to select documents to update. |
| `file` | `FileUpload` | Optional file to upload. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const query = new QueryBuilder()
  .where({ field: 'status', operator: Operator.Equals, value: 'draft' });

const result: PaginatedDocsDTO = await client.update({
  slug: 'posts',
  data: { status: 'published' },
  query: query,
});
```

### Delete by ID

Deletes a single document by ID.

```typescript
async deleteById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `id` | `string` | Document ID. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.deleteById({ slug: 'posts', id: '123' });
```

### Bulk delete

Bulk-deletes all documents matching a query.

```typescript
async delete(options: { slug: string; query: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `query` | `QueryBuilder` | Query to select documents to delete. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const query = new QueryBuilder()
  .where({ field: 'status', operator: Operator.Equals, value: 'archived' });

const result: PaginatedDocsDTO = await client.delete({
  slug: 'posts',
  query: query,
});
```

---

## Globals

### Find global

Retrieves a global document.

```typescript
async findGlobal(options: { slug: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Global slug. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.findGlobal({ slug: 'site-settings' });
```

### Update global

Updates a global document.

```typescript
async updateGlobal(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Global slug. |
| `data` | `Json` | Fields to update. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.updateGlobal({
  slug: 'site-settings',
  data: { siteName: 'My Site' },
});
```

---

## Authentication

### Login

Authenticates a user and returns a JWT token.

```typescript
async login(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<LoginResultDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `data` | `Json` | Credentials (e.g. `{ email, password }`). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: LoginResultDTO = await client.login({
  slug: 'users',
  data: { email: 'user@example.com', password: 'secret' },
});

// result.token   — "eyJhbGciOi..."
// result.exp     — 1700000000
// result.user    — DocumentDTO
// result.message — "Authentication Passed"
```

### Me

Retrieves the currently authenticated user.

```typescript
async me(options: { slug: string; signal?: AbortSignal }): Promise<MeResultDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const me: MeResultDTO = await client.me({ slug: 'users' });

// me.user       — DocumentDTO
// me.token      — "eyJhbGciOi..."
// me.exp        — 1700000000
// me.collection — "users"
// me.strategy   — "local-jwt"
```

### Refresh token

Refreshes the current JWT token.

```typescript
async refreshToken(options: { slug: string; signal?: AbortSignal }): Promise<RefreshResultDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: RefreshResultDTO = await client.refreshToken({ slug: 'users' });

// result.refreshedToken — "eyJhbGciOi..."
// result.exp            — 1700003600
// result.user           — DocumentDTO
```

### Forgot password

Initiates the forgot-password flow.

```typescript
async forgotPassword(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<MessageDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `data` | `Json` | Request body (e.g. `{ email }`). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: MessageDTO = await client.forgotPassword({
  slug: 'users',
  data: { email: 'user@example.com' },
});

// result.message — "Success"
```

### Reset password

Completes a password reset using a reset token.

```typescript
async resetPassword(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<ResetPasswordResultDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `data` | `Json` | Reset data (e.g. `{ token, password }`). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: ResetPasswordResultDTO = await client.resetPassword({
  slug: 'users',
  data: { token: 'reset-token', password: 'newPassword123' },
});

// result.user  — DocumentDTO
// result.token — "eyJhbGciOi..."
```

### Verify email

Verifies a user's email address.

```typescript
async verifyEmail(options: { slug: string; token: string; signal?: AbortSignal }): Promise<MessageDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `token` | `string` | Email verification token. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: MessageDTO = await client.verifyEmail({
  slug: 'users',
  token: 'verification-token',
});

// result.message — "Email verified successfully."
```

### Logout

Logs out the currently authenticated user.

```typescript
async logout(options: { slug: string; signal?: AbortSignal }): Promise<MessageDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: MessageDTO = await client.logout({ slug: 'users' });

// result.message — "You have been logged out successfully."
```

### Unlock

Unlocks a user account that has been locked due to failed login attempts.

```typescript
async unlock(options: { slug: string; data: Json; signal?: AbortSignal }): Promise<MessageDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Auth-enabled collection slug. |
| `data` | `Json` | Unlock data (e.g. `{ email }`). |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: MessageDTO = await client.unlock({
  slug: 'users',
  data: { email: 'user@example.com' },
});

// result.message — "Success"
```

### JWT Authentication

```typescript
import { PayloadSDK, JwtAuth } from 'payload-cms-http-client';

const client = new PayloadSDK({ baseUrl: 'http://localhost:3000' });

// Login to get a token
const loginResult: LoginResultDTO = await client.login({
  slug: 'users',
  data: { email: 'user@example.com', password: 'secret' },
});

// Set the token on the client
client.setJwtAuth({ auth: new JwtAuth({ token: loginResult.token }) });

// Authenticated requests now include the Bearer token
const me: MeResultDTO = await client.me({ slug: 'users' });
```

### API Key Authentication

```typescript
import { PayloadSDK, ApiKeyAuth } from 'payload-cms-http-client';

const client = new PayloadSDK({ baseUrl: 'http://localhost:3000' });
client.setApiKeyAuth({ auth: new ApiKeyAuth({ collectionSlug: 'users', apiKey: 'your-api-key-here' }) });
```

#### ApiKeyAuth

Sets the `Authorization` header to `{slug} API-Key {key}`.

```typescript
new ApiKeyAuth(options: { collectionSlug: string; apiKey: string })
```

#### JwtAuth

Sets the `Authorization` header to `Bearer {token}`.

```typescript
new JwtAuth(options: { token: string })
```

Both implement `IAuthCredential` internally. Use `setApiKeyAuth()` or `setJwtAuth()` to apply them to the client, or `clearAuth()` to remove credentials.

---

## Versions

### Find versions

Retrieves a paginated list of versions for a collection.

```typescript
async findVersions(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `query` | `QueryBuilder` | Optional query parameters. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: PaginatedDocsDTO = await client.findVersions({ slug: 'posts' });
```

### Find version by ID

Retrieves a single version by ID.

```typescript
async findVersionById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `id` | `string` | Version ID. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.findVersionById({ slug: 'posts', id: 'version-id' });
```

### Restore version

Restores a collection document to a specific version.

```typescript
async restoreVersion(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Collection slug. |
| `id` | `string` | Version ID to restore. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.restoreVersion({ slug: 'posts', id: 'version-id' });
```

### Find global versions

Retrieves a paginated list of versions for a global.

```typescript
async findGlobalVersions(options: { slug: string; query?: QueryBuilder; signal?: AbortSignal }): Promise<PaginatedDocsDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Global slug. |
| `query` | `QueryBuilder` | Optional query parameters. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const result: PaginatedDocsDTO = await client.findGlobalVersions({ slug: 'site-settings' });
```

### Find global version by ID

Retrieves a single global version by ID.

```typescript
async findGlobalVersionById(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Global slug. |
| `id` | `string` | Version ID. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.findGlobalVersionById({
  slug: 'site-settings',
  id: 'version-id',
});
```

### Restore global version

Restores a global document to a specific version.

```typescript
async restoreGlobalVersion(options: { slug: string; id: string; signal?: AbortSignal }): Promise<DocumentDTO>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Global slug. |
| `id` | `string` | Version ID to restore. |
| `signal` | `AbortSignal` | Optional abort signal for cancellation. |

#### Example
```typescript
const document: DocumentDTO = await client.restoreGlobalVersion({
  slug: 'site-settings',
  id: 'version-id',
});
```

---

## Custom Endpoints

Escape hatch for custom endpoints. Returns raw JSON instead of a DTO.

```typescript
async request(config: RequestConfig, signal?: AbortSignal): Promise<Json | undefined>
```

`RequestConfig` groups all request options:

```typescript
type RequestConfig = {
  method: HttpMethod;
  path: string;
  body?: Json;
  query?: QueryBuilder;
};
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `method` | `HttpMethod` | HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). |
| `path` | `string` | URL path appended to base URL (e.g. `/api/custom-endpoint`). |
| `body` | `Json` | Optional JSON request body. |
| `query` | `QueryBuilder` | Optional query parameters. |

#### Example
```typescript
import { HttpMethod } from 'payload-cms-http-client';

const result: Json | undefined = await client.request({
  method: HttpMethod.POST,
  path: '/api/custom-endpoint',
  body: { key: 'value' },
});
```

---

## Querying

### QueryBuilder

Fluent builder for query parameters. All methods return `this` for chaining.

#### Example
```typescript
import { QueryBuilder, Operator } from 'payload-cms-http-client';

const query = new QueryBuilder()
  .where({ field: 'status', operator: Operator.Equals, value: 'published' })
  .sort({ field: 'createdAt' })
  .limit({ value: 10 })
  .page({ value: 2 });

const result = await client.find({ slug: 'posts', query: query });

// Serializes to: ?where[status][equals]=published&sort=createdAt&limit=10&page=2
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `limit` | `options: { value: number }` | Maximum documents per page. |
| `page` | `options: { value: number }` | Page number. |
| `sort` | `options: { field: string }` | Sort ascending by field. |
| `sortByDescending` | `options: { field: string }` | Sort descending by field. |
| `depth` | `options: { value: number }` | Population depth for relationships. |
| `locale` | `options: { value: string }` | Locale for localized fields. |
| `fallbackLocale` | `options: { value: string }` | Fallback locale. |
| `select` | `options: { fields: string[] }` | Fields to include in response. |
| `populate` | `options: { fields: string[] }` | Relationships to populate. |
| `where` | `options: { field, operator, value }` | Add a where condition. |
| `and` | `options: { callback: (WhereBuilder) => void }` | Nested AND group. |
| `or` | `options: { callback: (WhereBuilder) => void }` | Nested OR group. |
| `join` | `options: { callback: (JoinBuilder) => void }` | Configure joins. |

### WhereBuilder

Used inside `and()` and `or()` callbacks to compose nested where clauses.

#### Example
```typescript
const query = new QueryBuilder()
  .where({ field: 'status', operator: Operator.Equals, value: 'published' })
  .or({ callback: (builder) => {
    builder
      .where({ field: 'category', operator: Operator.Equals, value: 'news' })
      .where({ field: 'category', operator: Operator.Equals, value: 'blog' });
  }});

// Serializes to: ?where[status][equals]=published&where[or][0][category][equals]=news&where[or][1][category][equals]=blog
```

Nested AND groups work the same way:

```typescript
const query = new QueryBuilder()
  .where({ field: 'status', operator: Operator.Equals, value: 'published' })
  .and({ callback: (builder) => {
    builder
      .where({ field: 'views', operator: Operator.GreaterThan, value: 100 })
      .where({ field: 'featured', operator: Operator.Equals, value: true });
  }});
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `where` | `options: { field, operator, value }` | Add a where condition. |
| `and` | `options: { callback: (WhereBuilder) => void }` | Nested AND group. |
| `or` | `options: { callback: (WhereBuilder) => void }` | Nested OR group. |

### JoinBuilder

Used inside the `join()` callback to configure relationship joins.

#### Example
```typescript
const query = new QueryBuilder()
  .join({ callback: (join) => {
    join
      .limit({ on: 'comments', value: 5 })
      .sort({ on: 'comments', field: 'createdAt' })
      .where({ on: 'comments', field: 'status', operator: Operator.Equals, value: 'approved' });
  }});

const result = await client.find({ slug: 'posts', query: query });
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `limit` | `options: { on, value }` | Limit documents for a join field. |
| `page` | `options: { on, value }` | Page number for a join field. |
| `sort` | `options: { on, field }` | Sort ascending by field. |
| `sortByDescending` | `options: { on, field }` | Sort descending by field. |
| `count` | `options: { on, value? }` | Enable/disable counting. |
| `where` | `options: { on, field, operator, value }` | Where condition on a join field. |
| `and` | `options: { on, callback }` | Nested AND group on a join field. |
| `or` | `options: { on, callback }` | Nested OR group on a join field. |
| `disable` | — | Disable all joins. |
| `isDisabled` | — | (getter) Whether joins are disabled. |

---

## DTOs

The included DTOs represent the **lowest common denominator** of a Payload CMS response. Because Payload collections are schema-defined by the consumer, this library cannot know the shape of your documents at compile time. Instead, `DocumentDTO` captures the universal fields (`id`, `createdAt`, `updatedAt`) and exposes the full response as a raw `json` dictionary.

These DTOs are **not intended to be your final domain models**. They serve as a transport-level representation that you should map into richer, typed models in your own application:

```typescript
// Your domain model
interface BlogPost {
  id: string;
  title: string;
  content: string;
  publishedAt: Date;
}

// Map from DTO to your model
function toBlogPost(dto: DocumentDTO): BlogPost {
  return {
    id: dto.id,
    title: dto.json['title'] as string,
    content: dto.json['content'] as string,
    publishedAt: new Date(dto.json['publishedAt'] as string),
  };
}

const dto = await client.findById({ slug: 'posts', id: '123' });
const post: BlogPost = toBlogPost(dto);
```

### DocumentDTO

Returned by single-document operations (`create`, `findById`, `updateById`, `deleteById`, globals, versions).

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Document ID. |
| `json` | `Json` | The full raw JSON payload. |
| `createdAt` | `Date \| undefined` | Creation timestamp. |
| `updatedAt` | `Date \| undefined` | Last update timestamp. |

### PaginatedDocsDTO

Returned by paginated operations (`find`, `update`, `delete`, `findVersions`).

| Property | Type | Description |
|----------|------|-------------|
| `docs` | `DocumentDTO[]` | Array of documents. |
| `totalDocs` | `number` | Total matching documents. |
| `totalPages` | `number` | Total pages. |
| `page` | `number \| undefined` | Current page. |
| `limit` | `number` | Documents per page. |
| `hasNextPage` | `boolean` | Whether a next page exists. |
| `hasPrevPage` | `boolean` | Whether a previous page exists. |
| `nextPage` | `number \| undefined` | Next page number. |
| `prevPage` | `number \| undefined` | Previous page number. |

### Auth DTOs

| DTO | Returned by | Properties |
|-----|-------------|------------|
| `LoginResultDTO` | `login()` | `token`, `exp`, `user` (DocumentDTO), `message` |
| `MeResultDTO` | `me()` | `user`, `token`, `exp`, `collection`, `strategy` |
| `RefreshResultDTO` | `refreshToken()` | `refreshedToken`, `exp`, `user` |
| `ResetPasswordResultDTO` | `resetPassword()` | `user`, `token` |
| `MessageDTO` | `forgotPassword()`, `verifyEmail()`, `logout()`, `unlock()` | `message` |

### ErrorResultDTO

Represents one entry in the `errors[]` array from a failed Payload response. Payload's error shape is intentionally dynamic — only the base fields below are guaranteed across all error types. The `json` property gives access to the full raw entry, including the `data` block present on `ValidationError` and `APIError` responses.

See [Error Handling](#error-handling) for usage examples.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| undefined` | The error class name (e.g. `"ValidationError"`, `"Forbidden"`). Sourced from `errors[n].name`. |
| `message` | `string \| undefined` | The human-readable error message. Sourced from `errors[n].message`. |
| `field` | `string \| undefined` | The field path associated with the error. Set on Mongoose validation items only. |
| `json` | `Record<string, unknown>` | The full raw JSON for this `errors[n]` entry. |

---

## Error Handling

`PayloadError` is thrown when a Payload CMS API request fails with a non-2xx status code.

```typescript
class PayloadError extends Error {
  readonly statusCode: number;
  readonly response: Response | undefined;
  readonly body: string | undefined;
  readonly serverStack: string | undefined;
  readonly result: ErrorResultDTO[];
}
```

| Property | Type | Description |
|----------|------|-------------|
| `statusCode` | `number` | HTTP status code. |
| `response` | `Response \| undefined` | The original `Response` object. |
| `message` | `string` | Human-readable status code message (from `Error`). |
| `body` | `string \| undefined` | The raw unparsed JSON response body, if available. |
| `serverStack` | `string \| undefined` | Server-side stack trace. Payload includes this in development mode only. |
| `result` | `ErrorResultDTO[]` | Parsed entries from `errors[]` in the response body. |

Each entry in `result` is an [`ErrorResultDTO`](#errorresultdto).

### Basic usage

```typescript
import { PayloadError } from 'payload-cms-http-client';

try {
  const document: DocumentDTO = await client.findById({ slug: 'posts', id: 'nonexistent' });
}
catch (error) {
  if (error instanceof PayloadError) {
    console.log(`Status: ${error.statusCode}`);

    for (const entry of error.result) {
      console.log(`${entry.name ?? 'error'}: ${entry.message}`);
    }
  }
  else {
    // Network failure, timeout, or parsing error
  }
}
```

### Accessing richer error data via json

Payload's `ValidationError` responses include a `data` block with field-level detail. The library does not model this automatically — define your own types and map from the `json` escape hatch:

```typescript
interface ValidationFieldError {
  message: string;
  path: string | undefined;
}

interface ValidationError {
  collection: string | undefined;
  global: string | undefined;
  id: string | undefined;
  message: string | undefined;
  fieldErrors: ValidationFieldError[];
}

function fromJson(entry: ErrorResultDTO): ValidationError | null {
  if (entry.name !== 'ValidationError') {
    return null;
  }

  const data = entry.json['data'] as Record<string, unknown> | undefined;

  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const fieldErrors: ValidationFieldError[] = [];

  if (Array.isArray(data['errors'])) {
    for (const item of data['errors']) {
      const fieldJson = item as Record<string, unknown>;
      fieldErrors.push({
        message: fieldJson['message'] as string,
        path: typeof fieldJson['path'] === 'string' ? fieldJson['path'] : undefined,
      });
    }
  }

  return {
    collection: typeof data['collection'] === 'string' ? data['collection'] : undefined,
    global: typeof data['global'] === 'string' ? data['global'] : undefined,
    id: data['id'] != null ? String(data['id']) : undefined,
    message: entry.message,
    fieldErrors,
  };
}
```

Then use it when catching a `PayloadError`:

```typescript
catch (error) {
  if (error instanceof PayloadError) {
    for (const entry of error.result) {
      const validationError = fromJson(entry);

      if (validationError === null) {
        console.log(`${entry.name ?? 'error'}: ${entry.message}`);
        continue;
      }

      console.log(`Validation failed on '${validationError.collection ?? validationError.global}':`);

      for (const fieldError of validationError.fieldErrors) {
        console.log(`  ${fieldError.path}: ${fieldError.message}`);
      }
    }
  }
}
```

---

## Types

### Json

The core serialization type used for document data and request/response bodies.

```typescript
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type Json = JsonObject;
```

### Operator

All supported Payload CMS where operators, exposed as a string enum.

```typescript
enum Operator {
  Equals = 'equals',
  NotEquals = 'not_equals',
  Contains = 'contains',
  Like = 'like',
  NotLike = 'not_like',
  In = 'in',
  NotIn = 'not_in',
  All = 'all',
  Exists = 'exists',
  GreaterThan = 'greater_than',
  GreaterThanEqual = 'greater_than_equal',
  LessThan = 'less_than',
  LessThanEqual = 'less_than_equal',
  Within = 'within',
  Intersects = 'intersects',
  Near = 'near',
}
```

### HttpMethod

HTTP methods accepted by `request()`, exposed as a string enum.

```typescript
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}
```
