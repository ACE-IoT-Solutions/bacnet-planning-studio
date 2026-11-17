# Contributing BACnet quiz questions

Quiz questions are content, not application code. To add or revise them, edit only [`src/data/bacnet-quiz-questions.json`](../src/data/bacnet-quiz-questions.json).

The file points to [`public/schemas/bacnet-quiz-question-bank.schema.json`](../public/schemas/bacnet-quiz-question-bank.schema.json), so editors with JSON Schema support can validate entries and offer field completion. The same schema is published with the application for external tooling.

## Add a question

1. Copy an existing question object in the `questions` array.
2. Assign the next unused stable ID using the `BAC-###` format. Never reuse an ID, because browser learning history is keyed by it.
3. Choose a category and one of the supported difficulty values: `foundation`, `intermediate`, `advanced`, or `elite`.
4. Provide exactly four distinct options.
5. Set `correctIndex` to the zero-based position of the answer: `0` is A, `1` is B, `2` is C, and `3` is D.
6. Include a concise explanation that teaches why the answer is correct.
7. For `elite` questions, include at least one authoritative technical source in `references`, with a precise clause, table, page, or source-code locator when available.
8. Run the checks below and include the regenerated review table in the pull request.

```bash
npm test
npm run quiz:review
npm run quiz:review:check
```

## Question fields

| Field | Purpose |
|---|---|
| `id` | Stable unique identifier such as `BAC-101` |
| `category` | Topic used to label the question |
| `difficulty` | `foundation`, `intermediate`, `advanced`, or `elite` |
| `prompt` | The question shown to the learner |
| `options` | Exactly four answer choices |
| `correctIndex` | Zero-based index into `options` |
| `explanation` | Feedback shown after answering |
| `references` | Optional source list; expected for `elite` questions |

The automated tests reject duplicate IDs, malformed choices, invalid answer indexes, and incomplete entries. The generated manual-review tables are the [full question bank](reviews/bacnet-competency-question-bank.md), the [complete elite candidate review](reviews/bacnet-elite-question-candidates.md), and focused review sheets such as the [IP, Ethernet, and ARC156 candidates](reviews/bacnet-elite-ip-ethernet-arc156-candidates.md).
