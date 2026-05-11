/**
 * Represents a per-document error within a bulk write operation response.
 * A bulk operation can partially succeed — the operation itself returns 200,
 * but individual documents that could not be updated or deleted are reported here
 * alongside the successfully affected documents.
 */
export class BulkOperationErrorDTO {
  /**
   * The ID of the document that failed.
   */
  id: string = '';

  /**
   * The human-readable error message describing why the document failed.
   */
  message: string = '';
}
