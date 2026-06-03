# Prompt templates

These files are the prompts the Study Hub generators send to Gemma 4. Edit a
file here and the change takes effect on the next generation (no full restart
needed — files are re-read when their mtime changes).

## How it works

- Templates use Python `string.Template` syntax: `$variable` placeholders are
  substituted at generation time. The JSON `{ }` braces in the prompts are left
  untouched (that's why we use `$`, not `{}`).
- To **customise without editing the defaults**, drop a file at
  `prompts/custom/<name>.md`. It overrides the shipped default of the same name.
  The `custom/` directory is gitignored, so your personal prompts stay local.

⚠️ Keep the **JSON output contract** intact — every Study Hub generator expects a
top-level JSON **object** (`{"questions": [...]}`, `{"cards": [...]}`, etc.), not
a bare array. Changing that will break parsing.

## Files & available variables

| File | Used by | Variables |
| --- | --- | --- |
| `quiz.md` | Quiz generator | `$difficulty` `$diff_note` `$num_questions` `$types_csv` `$type_descriptions` `$context` |
| `flashcards.md` | Flashcard generator | `$difficulty` `$diff_note` `$num_cards` `$context` |
| `mindmap.md` | Mindmap generator | `$min_l1` `$max_l1` `$min_l2` `$max_l2` `$max_label_chars` `$context` |
| `workshop_outline.md` | Workshop outline (pass 1) | `$difficulty` `$diff_note` `$num_lessons` `$context` |
| `workshop_lesson.md` | Workshop lesson (pass 2) | `$lesson_title` `$workshop_title` `$workshop_summary` `$difficulty` `$diff_note` `$key_points` `$objectives` `$other_lessons` `$lesson_number` `$total_lessons` `$context` |

`$context` is the retrieved source material (already chunked + labelled).
`$diff_note` is the per-difficulty guidance sentence. An unknown `$token` in a
template is left verbatim (safe substitution), so a typo degrades gracefully.
