# Quiz JSON Format

This document describes the schema used for all quiz JSON files in this repository and provides a sample file you can use as a starting point.

Quiz files are stored per certification under `<cert>/quiz/` (e.g. `az-900/quiz/`). They are plain JSON arrays — no dependencies, no build step — and are loaded directly by the CLI in `cli/cli.js`.

---

## File Naming

Quiz files must start with a number so the CLI picks them up and sorts them in order:

```
01-cloud-concepts.json
02-azure-architecture.json
08-governance-monitoring.json
```

Any `.json` file in the folder that does **not** start with a digit is ignored by the CLI.

---

## Top-Level Structure

A quiz file is a **JSON object** with a required metadata block and a questions array:

```json
{
  "meta": {
    "title": "Azure Fundamentals – Cloud Concepts",
    "subject": "Cloud Computing",
    "version": "1.0.0",
    "created": "2025-09-01"
  },
  "questions": [
    { ...question },
    { ...question }
  ]
}
```

---

## Metadata Object (`meta`) — Required

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Human-readable title for the quiz. |
| `subject` | `string` | No | Broad subject area (e.g. `"Cloud Computing"`, `"ISO 27001"`). |
| `version` | `string` | No | Semantic version string for tracking revisions. |
| `created` | `string` | No | ISO 8601 date string (`YYYY-MM-DD`). |

---

## Question Object

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `question_id` | `number` | Yes | Unique identifier within the file. Used for stable cross-referencing (e.g. linking from external tools or merging quiz files) — not for display order, which follows the array. Must not be renumbered on insertion. |
| `question_text` | `string` | Yes | The full question text shown to the user. |
| `options` | `object` | Yes | Map of answer options. Keys are single lowercase letters: `"a"`, `"b"`, `"c"`, `"d"`, etc. Minimum 2 options required. |
| `correct_answer` | `string[]` | Yes | Array of correct option key(s). Always an array. Single-select questions have one element (e.g. `["b"]`); multiple-select questions have two or more (e.g. `["a", "c"]`). The CLI infers question type from this array length — no separate `question_type` field is needed. |
| `difficulty` | `string` | No | Difficulty level of the question. Allowed values: `"easy"`, `"medium"`, `"hard"`. Defaults to `"medium"` if omitted. |
| `topic` | `string` | No | Specific sub-topic this question covers (e.g. `"CapEx vs OpEx"`, `"Shared Responsibility Model"`). Useful for filtering or grouping questions. |
| `tags` | `string[]` | No | Free-form labels for further categorisation (e.g. `["definition", "scenario", "AZ-900"]`). |

---

## Option Object

Each key in `options` maps to an option object:

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | The answer text shown to the user. |
| `is_true` | `boolean` | Yes | `true` if this option is a correct answer, `false` otherwise. Must be consistent with `correct_answer`. |
| `explanation` | `string` | Yes | Shown after the user answers. For correct options, explain *why* it is correct. For incorrect options, explain *why* it is wrong. |

---

## Single-Select Question

The most common type. The user presses a single letter key to answer immediately. `correct_answer` is a single-element array — the CLI treats any question with exactly one correct answer as single-select.

```json
{
  "question_id": 1,
  "question_text": "A company moves its servers from an on-premises datacenter to Azure and switches from buying hardware to paying a monthly fee. How does this change their cost model?",
  "difficulty": "medium",
  "topic": "CapEx vs OpEx",
  "tags": ["cost-model", "scenario", "AZ-900"],
  "options": {
    "a": {
      "text": "From OpEx to CapEx",
      "is_true": false,
      "explanation": "Incorrect. Buying on-premises hardware is CapEx. Moving to Azure shifts costs to OpEx, not the other way around."
    },
    "b": {
      "text": "From CapEx to OpEx",
      "is_true": true,
      "explanation": "Correct. Purchasing and maintaining physical servers is a capital expenditure (CapEx). Paying monthly for Azure services is an operational expenditure (OpEx)."
    },
    "c": {
      "text": "No change — both models have the same total cost",
      "is_true": false,
      "explanation": "Incorrect. The cost model changes fundamentally: on-premises requires large upfront investment, while cloud uses pay-as-you-go billing."
    },
    "d": {
      "text": "From CapEx to CapEx and OpEx combined",
      "is_true": false,
      "explanation": "Incorrect. Cloud removes the need for capital hardware investment. Azure billing is purely OpEx."
    }
  },
  "correct_answer": ["b"]
}
```

---

## Multiple-Select Question

Used when two or more answers are correct. `correct_answer` contains more than one element — the CLI infers multiple-select from this automatically. The CLI shows checkboxes and the user toggles options with letter keys before pressing Enter to submit.

```json
{
  "question_id": 2,
  "question_text": "A startup is launching a new service and wants to avoid overbuying infrastructure before customer demand is known. Which TWO cloud benefits are the strongest match for this scenario?",
  "difficulty": "easy",
  "topic": "Cloud Benefits",
  "tags": ["elasticity", "pricing", "scenario"],
  "options": {
    "a": {
      "text": "Elasticity",
      "is_true": true,
      "explanation": "Correct. Elasticity lets resources automatically expand or shrink based on actual demand, avoiding both over-provisioning and under-provisioning."
    },
    "b": {
      "text": "Physical access to servers",
      "is_true": false,
      "explanation": "Incorrect. Physical access to servers is not a cloud benefit — cloud customers do not have access to provider datacenter hardware."
    },
    "c": {
      "text": "Consumption-based pricing",
      "is_true": true,
      "explanation": "Correct. Pay-as-you-go pricing means the startup only pays for what it actually uses, with no upfront commitment to a fixed capacity."
    },
    "d": {
      "text": "Manual capacity forecasting",
      "is_true": false,
      "explanation": "Incorrect. Cloud reduces the need for manual capacity forecasting by allowing on-demand scaling instead."
    }
  },
  "correct_answer": ["a", "c"]
}
```

---

## Schema Constraints Summary

- `meta` is **required**. `meta.title` is the only required field within it.
- `correct_answer` is **always an array**. Single-select: one element (e.g. `["b"]`). Multiple-select: two or more (e.g. `["a", "c"]`). The CLI infers question type from array length — no `question_type` field exists.
- `options` must contain **at least 2** entries.
- `difficulty` defaults to `"medium"` if omitted. Allowed values: `"easy"`, `"medium"`, `"hard"`.
- `is_true` on each option must be consistent with `correct_answer` — if a key appears in `correct_answer`, its `is_true` must be `true`, and vice versa.
- `question_id` must be unique within the file and stable across edits (do not renumber on insertion). Display order follows the array, not the ID.
- `tags` entries are free-form lowercase strings; no fixed vocabulary.
- `meta.subject` (broad area) and `question.topic` (specific sub-topic) serve different granularities — use both to enable coarse and fine filtering.


---

## Scoring Rules

| Question type | Correct if |
|---|---|
| Single-select | The selected key matches `correct_answer` |
| Multiple-select | The selected keys match `correct_answer` exactly — same keys, no extras, no omissions |

Partial credit is not awarded for multiple-select questions: selecting one out of two correct answers scores zero.

---

## CLI Behaviour by Question Type

| Behaviour | Single-select | Multiple-select |
|---|---|---|
| Input method | Press a letter key — submits immediately | Press letter keys to toggle; press Enter to submit |
| Option display | `a)  Option text` | `[ ] a)  Option text` / `[✓] a)  Option text` |
| Post-answer feedback | Correct option highlighted green; chosen wrong option highlighted red | Each option colour-coded individually |
| Controls hint | `[a-d] answer` | `[a-d] toggle  [Enter] submit` |

---

## Full Sample File

A complete, ready-to-use sample with one single-select and one multiple-select question:

```json
{
  "meta": {
    "title": "Azure Fundamentals – Cloud Concepts",
    "subject": "Azure Fundamentals (AZ-900)",
    "version": "1.0.0",
    "created": "2025-09-01"
  },
  "questions": [
    {
      "question_id": 1,
      "question_text": "A company moves its servers from an on-premises datacenter to Azure and switches from buying hardware to paying a monthly fee. How does this change their cost model?",
      "difficulty": "medium",
      "topic": "CapEx vs OpEx",
      "tags": ["cost-model", "scenario", "AZ-900"],
      "options": {
        "a": {
          "text": "From OpEx to CapEx",
          "is_true": false,
          "explanation": "Incorrect. Buying on-premises hardware is CapEx. Moving to Azure shifts costs to OpEx, not the other way around."
        },
        "b": {
          "text": "From CapEx to OpEx",
          "is_true": true,
          "explanation": "Correct. Purchasing and maintaining physical servers is a capital expenditure (CapEx). Paying monthly for Azure services is an operational expenditure (OpEx)."
        },
        "c": {
          "text": "No change — both models have the same total cost",
          "is_true": false,
          "explanation": "Incorrect. The cost model changes fundamentally: on-premises requires large upfront investment, while cloud uses pay-as-you-go billing."
        },
        "d": {
          "text": "From CapEx to CapEx and OpEx combined",
          "is_true": false,
          "explanation": "Incorrect. Cloud removes the need for capital hardware investment. Azure billing is purely OpEx."
        }
      },
      "correct_answer": ["b"]
    },
    {
      "question_id": 2,
      "question_text": "A startup is launching a new service and wants to avoid overbuying infrastructure before customer demand is known. Which TWO cloud benefits are the strongest match for this scenario?",
      "difficulty": "easy",
      "topic": "Cloud Benefits",
      "tags": ["elasticity", "pricing", "scenario"],
      "options": {
        "a": {
          "text": "Elasticity",
          "is_true": true,
          "explanation": "Correct. Elasticity lets resources automatically expand or shrink based on actual demand, avoiding both over-provisioning and under-provisioning."
        },
        "b": {
          "text": "Physical access to servers",
          "is_true": false,
          "explanation": "Incorrect. Physical access to servers is not a cloud benefit — cloud customers do not have access to provider datacenter hardware."
        },
        "c": {
          "text": "Consumption-based pricing",
          "is_true": true,
          "explanation": "Correct. Pay-as-you-go pricing means the startup only pays for what it actually uses, with no upfront commitment to a fixed capacity."
        },
        "d": {
          "text": "Manual capacity forecasting",
          "is_true": false,
          "explanation": "Incorrect. Cloud reduces the need for manual capacity forecasting by allowing on-demand scaling instead."
        }
      },
      "correct_answer": ["a", "c"]
    }
  ]
}
```

---

## Authoring Tips

- **Write the explanation before the question** — knowing why each option is right or wrong helps you phrase the question and distractors more precisely
- **Make wrong options plausible** — good distractors are things a learner might reasonably believe, not obvious nonsense
- **For multiple-select, say how many** — phrase the question as "Which TWO..." or "Select all that apply" so the user knows what to expect
- **Keep explanations concise** — one or two sentences is enough; the explanation should reinforce the concept, not re-explain the whole topic
- **`is_true` must match `correct_answer`** — the CLI uses `correct_answer` for scoring; `is_true` is metadata for tooling and human review. Keep them consistent
- **Avoid trick questions** — the goal is to reinforce learning, not to catch people out on ambiguous wording
