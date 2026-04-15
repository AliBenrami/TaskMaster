import { getDoclingTestErrorResponse, replaceDoclingTestWithUpload } from "@/lib/docling-test/service";
import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, logs?: string[]) {
  return NextResponse.json({ error: message, logs: logs ?? [] }, { status });
}

function encodeStreamChunk(payload: Record<string, unknown>) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export function createDoclingTestUploadStream(params: {
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encodeStreamChunk(payload));
      };

      send({ type: "start" });

      try {
        const result = await replaceDoclingTestWithUpload({
          ...params,
          onLog(message) {
            send({ type: "log", message });
          },
        });

        send({
          type: "result",
          ok: true,
          isDuplicate: result.isDuplicate,
          runId: result.runId,
        });
      } catch (error) {
        const { message, status } = getDoclingTestErrorResponse(error);
        send({
          type: "error",
          error: message,
          status,
        });
      } finally {
        controller.close();
      }
    },
  });
}
