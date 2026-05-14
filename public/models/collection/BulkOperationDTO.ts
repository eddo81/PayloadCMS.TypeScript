import { DocumentDTO } from "./DocumentDTO.js";
import { BulkOperationErrorDTO } from "../errors/BulkOperationErrorDTO.js";
import type { Json } from "../../../types/Json.js";

/**
 * Represents the result of a bulk write operation (update or delete).
 * Maps to Payload CMS's `BulkOperationResult` response shape.
 */
export class BulkOperationDTO {
  docs: DocumentDTO[] = [];
  errors: BulkOperationErrorDTO[] = [];

  /**
   * Maps a bulk operation JSON response into a {@link BulkOperationDTO}.
   *
   * @param {Json} json - The raw JSON from a Payload CMS endpoint.
   *
   * @returns {BulkOperationDTO} A populated instance.
   */
  static fromJson(json: Json): BulkOperationDTO {
    const dto = new BulkOperationDTO();
    const data = (json ?? {}) as Json;

    if (Array.isArray(data['docs'])) {
      dto.docs = data['docs']
        .filter((item): item is Json => typeof item === 'object' && item !== null && !Array.isArray(item))
        .map(doc => DocumentDTO.fromJson(doc));
    }

    if (Array.isArray(data['errors'])) {
      dto.errors = data['errors']
        .filter((item): item is Json => typeof item === 'object' && item !== null && !Array.isArray(item))
        .map(item => BulkOperationErrorDTO.fromJson(item));
    }

    return dto;
  }
}
