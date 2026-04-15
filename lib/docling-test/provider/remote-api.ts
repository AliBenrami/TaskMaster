import type {
  DocumentParseProvider,
  DocumentParseProviderInput,
  DocumentParseProviderResult,
} from "../contracts";
import { DoclingTestError } from "../errors";

export class RemoteDoclingApiProvider implements DocumentParseProvider {
  async parse(input: DocumentParseProviderInput): Promise<DocumentParseProviderResult> {
    void input;
    throw new DoclingTestError(
      "Unsupported Docling backend: remote-api is reserved for future private API integration.",
      500,
    );
  }
}
