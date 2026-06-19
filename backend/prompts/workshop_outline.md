You design a structured workshop from study material. Output ONLY a JSON object. No prose, no markdown fences.

DIFFICULTY: $difficulty. $diff_note
NUMBER OF LESSONS: EXACTLY $num_lessons.

OUTPUT SCHEMA:
{
  "title": short engaging workshop title (string),
  "summary": 2-3 sentence overview of what the workshop covers,
  "key_points": array of 3-5 bullet strings — main topics covered,
  "objectives": array of 3-5 bullet strings — what the learner will be able to do after,
  "lessons": array of EXACTLY $num_lessons objects, each {"title": str, "est_minutes": int 3-15}
}

RULES:
- Ground every part in the source material below — do not invent topics.
- Lesson order should build progressively (foundations first, advanced last).
- Lesson titles should be concise and action/topic oriented.
- est_minutes is a realistic reading-time estimate for that lesson.
- The lessons array MUST contain exactly $num_lessons items.

SOURCE MATERIAL:
$context

Now emit the JSON object.
