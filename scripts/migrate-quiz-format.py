#!/usr/bin/env python3
"""
Migrate quiz JSON files from the old bare-array format to the new structured format.

Old format:
  [ { "question_id": ..., "correct_answer": "b", ... }, ... ]

New format:
  {
    "meta": { "title": "...", "subject": "..." },
    "questions": [ { "correct_answer": ["b"], ... }, ... ]
  }

Changes applied per question:
  - correct_answer: wrap string in list if not already a list
  - question_type: removed if present
"""

import json
import re
from pathlib import Path

QUIZES_DIR = Path(__file__).parent.parent / "quizes"

SUBJECT_MAP = {
    "az-900": "Azure Fundamentals (AZ-900)",
    "ai-900": "AI Fundamentals (AI-900)",
    "ai-102": "Designing and Implementing a Microsoft Azure AI Solution (AI-102)",
    "ab-900": "Microsoft 365 Copilot (AB-900)",
}


def derive_subject(dir_name: str) -> str:
    return SUBJECT_MAP.get(dir_name, dir_name.upper())


def derive_title(filename_stem: str) -> str:
    # Strip leading number+hyphen prefix, e.g. "01-cloud-concepts" -> "cloud-concepts"
    stripped = re.sub(r"^\d+-", "", filename_stem)
    # Replace hyphens with spaces and title-case
    return stripped.replace("-", " ").title()


def migrate_question(question: dict) -> dict:
    q = dict(question)
    # Normalize correct_answer to always be a list
    ca = q.get("correct_answer")
    if isinstance(ca, str):
        q["correct_answer"] = [ca]
    elif not isinstance(ca, list):
        # Unexpected type — leave as-is but wrapped
        q["correct_answer"] = [ca] if ca is not None else []
    # Remove question_type if present
    q.pop("question_type", None)
    return q


def migrate_file(path: Path) -> bool:
    """
    Migrate a single file in-place.
    Returns True if migrated, False if skipped (already new format).
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Skip files already in new format
    if isinstance(data, dict) and "meta" in data:
        return False

    if not isinstance(data, list):
        print(f"  WARNING: unexpected format in {path}, skipping.")
        return False

    dir_name = path.parent.name
    subject = derive_subject(dir_name)
    title = derive_title(path.stem)

    questions = [migrate_question(q) for q in data]

    new_data = {
        "meta": {
            "title": title,
            "subject": subject,
        },
        "questions": questions,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return True


def main():
    json_files = sorted(QUIZES_DIR.rglob("*.json"))

    if not json_files:
        print(f"No JSON files found under {QUIZES_DIR}")
        return

    migrated = []
    skipped = []

    for path in json_files:
        rel = path.relative_to(QUIZES_DIR.parent)
        try:
            if migrate_file(path):
                migrated.append(rel)
                print(f"  migrated : {rel}")
            else:
                skipped.append(rel)
                print(f"  skipped  : {rel} (already new format)")
        except Exception as e:
            print(f"  ERROR    : {rel} — {e}")

    print()
    print(f"Done. Migrated {len(migrated)} file(s), skipped {len(skipped)} file(s).")


if __name__ == "__main__":
    main()
