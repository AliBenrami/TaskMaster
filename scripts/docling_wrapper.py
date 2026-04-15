from __future__ import annotations

import importlib.metadata
import json
import sys
from pathlib import Path


def fail(message: str) -> None:
    sys.stderr.write(f"{message}\n")
    sys.exit(1)


def export_raw_json(document) -> object:
    if hasattr(document, "export_to_dict"):
        return document.export_to_dict()

    if hasattr(document, "model_dump"):
        return document.model_dump()

    if hasattr(document, "export_to_json"):
        exported = document.export_to_json()
        return json.loads(exported) if isinstance(exported, str) else exported

    raise RuntimeError("Docling document did not expose a supported JSON export method.")


def export_markdown(document) -> str:
    if hasattr(document, "export_to_markdown"):
        return document.export_to_markdown()

    raise RuntimeError("Docling document did not expose export_to_markdown().")


def main() -> None:
    if len(sys.argv) < 3:
      fail("Usage: docling_wrapper.py <file_path> <input_format>")

    file_path = Path(sys.argv[1]).expanduser().resolve()
    input_format = sys.argv[2].strip().lower()

    if not file_path.exists():
        fail(f"Input file does not exist: {file_path}")

    try:
        from docling.document_converter import DocumentConverter
    except Exception as exc:  # pragma: no cover - runtime dependency
        fail(str(exc))

    try:
        converter = DocumentConverter()
        conversion_result = converter.convert(file_path)
        document = conversion_result.document
        markdown = export_markdown(document)
        raw_json = export_raw_json(document)
        provider_version = importlib.metadata.version("docling")
    except Exception as exc:  # pragma: no cover - runtime dependency
        fail(str(exc))

    print(
        json.dumps(
            {
                "ok": True,
                "provider": "docling",
                "providerVersion": provider_version,
                "inputFormat": input_format,
                "markdown": markdown,
                "rawJson": raw_json,
                "warnings": [],
            }
        )
    )


if __name__ == "__main__":
    main()
