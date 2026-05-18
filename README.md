# Gemma CogniVault

---

![Gemma Cognivault Logo with the tagline "Durable Local RAG Pipeline - Private AI . No Cloud . Your Data" ](frontend/public/gemma-cognivault-banner.jpg)

---

_This is a submission for the [Gemma 4 Challenge: Build with Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06)_

---

## What I Built

**Problem Statement**
AI has changed how work gets done. In just a few years, teams have moved from manually searching documents to asking chatbots to analyze contracts, extract key information, summarize reports, and reason across entire knowledge bases.

But for regulated industries, that promise comes with a problem.

If you work in finance, healthcare, or any organization handling sensitive internal data, you cannot paste private documents into any AI tool and hope for the best. In the EU and across global markets, data privacy and data sovereignty shape what systems you can use, where data can travel, and who is allowed to process it.

Cloud AI can be powerful, but with regulated data it raises hard questions. Where does the data go? Which region processes it? What happens to prompts, files, logs, and outputs? Who controls the infrastructure?

So teams pull back. They keep slower, less intelligent workflows because the risk feels too high.

The obvious alternative is local RAG: Retrieval-Augmented Generation running close to your own data. In theory, it offers private document search, private reasoning, and private answers.

In practice, many local RAG systems are not ready for serious enterprise use. Large document ingestion can be unreliable. If a pipeline crashes halfway through, progress can disappear, forcing teams to restart. Lightweight local models may ignore context, hallucinate tool calls, or fail at reasoning steps that matter.

The result is frustrating: cloud AI feels capable, but hard to approve for sensitive data. Local AI feels safer, but too fragile to trust.

CogniVault is built for that gap.

CogniVault is a 100% local, zero-token RAG pipeline for teams that need security, reliability, and serious reasoning over private documentation.

By combining DBOS durable workflows, Strands Agents, and Gemma 4, CogniVault brings fault-tolerant ingestion, agentic reasoning, and local document intelligence onto your own machine, without cloud APIs.

Your data stays local. Your documents stay under your control. Your AI workflow becomes durable enough for real business use.

For regulated teams, the future of AI should not live behind a glass wall.

## Demo

<!-- Embed a video walkthrough or share a link to your deployed project. -->

[![CogniVault Demo Video](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
_(Replace with actual YouTube link or video embed)_

## Code

<!-- Embed or share a link to your repository. -->

- [Project Repo Link](https://github.com/ndimoforaretas/local-gemma-rag)

## How I Used Gemma 4

To make CogniVault work entirely offline without sacrificing intelligence, I relied on two models:

1. **`embeddinggemma`**: Used to generate dense semantic vectors for the local FAISS index.
   - It perfectly mapped large documents without a single byte leaving the user's hardware.

2. **`gemma4:e4b`**: Used as the core intelligence and agent orchestrator.

**Why `gemma4:e4b` was the perfect fit:**
I didn't just want a chatbot; I wanted an autonomous agent.

- Standard lightweight local models frequently fail at complex instruction following—they hallucinate tool names or lose track of retrieved context.

- Gemma 4 natively integrates a specialized Thinking Mode and robust function-calling. When a compliance officer asks, _"Search the Q3 budget and calculate a 15% buffer"_, Gemma 4 doesn't just guess. It autonomously:

1. Calls the **Knowledge Base Tool** to query the FAISS index.
2. Reads the retrieved chunk to find the exact budget number.
3. Calls our local **Safe Calculator Tool** to execute the math flawlessly.
4. Calls the **System Clock** to timestamp the report.

Gemma 4 proved that you don't need a 100B+ parameter cloud model to achieve true, multi-step agentic workflows. You can do it securely, accurately, and entirely on your own laptop.

---

## Complete Project Information and Setup Guide

[Complete Project Information](/project-info.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
