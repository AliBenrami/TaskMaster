from __future__ import annotations

import importlib.metadata
import json
import os
import shutil
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


def patch_huggingface_symlink_fallback() -> None:
    try:
        from huggingface_hub import file_download as fd
    except Exception:
        return

    original_create_symlink = fd._create_symlink

    def patched_create_symlink(src: str, dst: str, new_blob: bool = False) -> None:
        try:
            return original_create_symlink(src, dst, new_blob=new_blob)
        except OSError as exc:
            winerror = getattr(exc, "winerror", None)
            if winerror != 1314:
                raise

            abs_src = os.path.abspath(os.path.expanduser(src))
            abs_dst = os.path.abspath(os.path.expanduser(dst))
            os.makedirs(os.path.dirname(abs_dst), exist_ok=True)
            try:
                os.remove(abs_dst)
            except OSError:
                pass

            if new_blob:
                shutil.move(abs_src, abs_dst)
            else:
                shutil.copyfile(abs_src, abs_dst)

    fd._create_symlink = patched_create_symlink


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
        patch_huggingface_symlink_fallback()
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
