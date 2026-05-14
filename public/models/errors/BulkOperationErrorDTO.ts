import type { Json } from "../../../types/Json.js";

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

  /**
   * Creates a {@link BulkOperationErrorDTO} from a single `errors[n]` item
   * within a bulk operation response.
   *
   * @param {Json} json - One entry from the `errors[]` array in a bulk operation response.
   *
   * @returns {BulkOperationErrorDTO} A populated instance.
   */
  static fromJson(json: Json): BulkOperationErrorDTO {
    const dto = new BulkOperationErrorDTO();

    if (typeof json['id'] === 'string') {
      dto.id = json['id'];
    }

    if (typeof json['message'] === 'string') {
      dto.message = json['message'];
    }

    return dto;
  }
}
