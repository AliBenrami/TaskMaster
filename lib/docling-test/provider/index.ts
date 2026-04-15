import type { DocumentParseProvider } from "../contracts";
import { DoclingTestError } from "../errors";
import { getDoclingBackend } from "../feature";
import { LocalDoclingPythonProvider } from "./local-python";
import { RemoteDoclingApiProvider } from "./remote-api";

export function getDocumentParseProvider(): DocumentParseProvider {
  const backend = getDoclingBackend();

  switch (backend) {
    case "local-python":
      return new LocalDoclingPythonProvider();
    case "remote-api":
      return new RemoteDoclingApiProvider();
    default:
      throw new DoclingTestError(`Unsupported Docling backend "${backend}".`, 500);
  }
}
