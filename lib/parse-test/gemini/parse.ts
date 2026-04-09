import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPartFromText,
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { parseTestResponseJsonSchema } from "../contracts";
import { ParseTestError, type ParseActivityLogger, toPublicParseTestError } from "../errors";
import { getParseTestModel } from "../feature";
import { parsePayloadText } from "../normalize";
import { createParseTestPrompt } from "./prompt";

function getGenAiClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new ParseTestError(
      "GOOGLE_GENERATIVE_AI_API_KEY is missing. Add it to your server environment before using ParseTest.",
      500,
    );
  }

  return new GoogleGenAI({ apiKey });
}

export async function parseSyllabusWithGemini(
  fileName: string,
  fileBuffer: Buffer,
  log?: ParseActivityLogger,
) {
  const tempFilePath = join(tmpdir(), `parse-test-${randomUUID()}.pdf`);
  const ai = getGenAiClient();

  try {
    log?.("Writing the uploaded PDF to a temporary file for Gemini.");
    await writeFile(tempFilePath, fileBuffer);

    log?.("Uploading the PDF to the Gemini Files API.");
    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: "application/pdf",
        displayName: fileName,
      },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType) {
      throw new ParseTestError("Gemini Files API upload succeeded without returning a usable file URI.", 502);
    }

    log?.("Gemini file upload succeeded. Requesting structured syllabus extraction.");
    const response = await ai.models.generateContent({
      model: getParseTestModel(),
      contents: createUserContent([
        createPartFromText(createParseTestPrompt(fileName)),
        createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
      ]),
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: parseTestResponseJsonSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new ParseTestError("Gemini returned an empty response for the syllabus parse.", 502);
    }

    log?.("Gemini returned JSON. Validating the structured parse against the schema.");
    const payload = parsePayloadText(responseText);
    log?.("Structured parse validated successfully.");

    return {
      geminiFileUri: uploadedFile.uri,
      payload,
    };
  } catch (error) {
    throw toPublicParseTestError(error);
  } finally {
    log?.("Cleaning up the temporary upload file.");
    await rm(tempFilePath, { force: true });
  }
}
