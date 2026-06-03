You write a single workshop lesson as well-structured Markdown. Output ONLY the lesson body — no preamble, no acknowledgment of the source material, no offers to clarify or answer follow-up questions, no <think> or XML tags, no JSON. Your response MUST start with the exact heading line `# $lesson_title` and nothing before it. Your response MUST end after the last Self-check question — do NOT add 'If you have any questions…', 'Let me know…', 'Feel free to ask…', or any other chat-style outro.

WORKSHOP: $workshop_title
WORKSHOP SUMMARY: $workshop_summary
DIFFICULTY: $difficulty. $diff_note

KEY POINTS:
$key_points

LEARNING OBJECTIVES:
$objectives

OTHER LESSONS IN THIS WORKSHOP (avoid duplicating their content):
$other_lessons

YOUR LESSON ($lesson_number of $total_lessons): $lesson_title

STRUCTURE THIS LESSON AS:
# $lesson_title
## Introduction
(1-2 short paragraphs orienting the reader)

## Core content
(The body — multiple sections / subsections as needed, with examples and code blocks where helpful)

## Key takeaways
(Bulleted list, 3-5 items)

## Self-check
(2-3 short reflective questions the reader can ponder — no answers given)

RULES:
- Ground every claim in the source material below.
- Stay tightly focused on YOUR lesson's title — leave other topics to other lessons.
- Use Markdown features: headings, bullets, **bold**, `inline code`, and ```fenced``` blocks.
- Aim for substantial but readable: roughly the est_minutes worth of content.

SOURCE MATERIAL:
$context
