# Vercel AI SDK

Docs for the `ai` package (AI SDK v7). Use for AI chat / agent work — generating and streaming text, tool calling, structured output, memory, and MCP.

## Core generation

- [Generating Text](generating_text.md): `generateText` / `streamText` fundamentals — the entry point for text generation.
- [Generate Text with Chat Prompt](generate_text_with_chat_prompt.md): Generate text from a series of messages (chat completion).
- [Stream Text with Chat Prompt](steam_text_with_chat_prompt.md): Stream chat completions to the client in real time.
- [Generate Text with Image Prompt](generate_text_with_image_prompt.md): Send images as part of the prompt (vision models).
- [Stream Text with Image Prompt](steam_text_with_image_prompt.md): Stream text generation with image inputs.
- [Generate Object](generate_object.md): Generate structured JSON with `Output.object` and a zod schema.
- [Settings](setting.md): Configure the AI SDK — maxOutputTokens, temperature, topP/K, penalties, retries, headers, etc.
- [Prompt Engineering](prompt_engineering.md): Tips for system prompts and message composition.

## Tools

- [Call Tools](call_tools.md): Let models call developer-provided tools during generation.
- [Tool Calling (full reference)](tool_calling.md): The complete tool-calling reference — tool definition, input schemas, multi-step loops, tool choice, error handling, and **tool approval (`needsApproval` / `toolApproval`)** for human-in-the-loop confirmations.
- [MCP Tools](mcp_tools.md): Connect to MCP servers with `createMCPClient` and use their tools.
- [Call Tools with Image Prompt](call_tools_with_image_prompt.md): Tool calling with image inputs.

## Files & uploads

- [File Upload](file_upload.md): Upload files through the SDK (`experimental_uploadFile`) and reference them in prompts/UI parts.

## Providers & models

- [Provider & Model Management](provider_and_model_management.md): Work with multiple providers and models — custom providers, middleware, model resolution.
- [Language Model Middleware](language_model_middleware.md): Wrap language models with middleware (guards, transforms, caching).

## Agents & memory

- [Build AI agents](build_ai_agents.md): Build TypeScript agents with `ToolLoopAgent` — one API for models, tools, structured output, and streaming.
- [Memory](memory.md): Three approaches to agent memory and their tradeoffs.
- [Build a Custom Memory Tool](build_a_custom_memory_tool.md): Filesystem-based custom memory tool.
- [Add Skills to Your Agent](add_skills_to_your_agent.md): Load SKILL.md-based skills into an agent at runtime.

## UI — chatbot (`useChat`)

- [Chatbot](ui_chatbot.md): The `useChat` hook — messages, status, send/reload/stop, error states.
- [Streaming Custom Data](ui_streaming_custom_data.md): Stream `data-*` parts from the server (`writer.write` / `createUIMessageStream`) — delivery checkpoints, transient metadata.
- [Transport](ui_transport.md): Custom transports with `useChat` — `DefaultChatTransport`, prepare/send options, custom `ChatTransport` implementations.
- [Chatbot Message Persistence](ui_chatbot_message_persistence.md): Store and load chat messages — server-side persistence, reloading as `initialMessages`, onFinish hooks.
- [Chatbot Tool Usage](ui_chatbot_tool_usages.md): Render tool calls in the UI — tool parts, streaming inputs, **tool approval parts (`approval-requested` / `approval-responded`)** for confirm cards, `addToolApprovalResponse`.
- [Chatbot Resume Streams](ui_chatbot_resume_streams.md): Resume in-flight streams after client disconnects.
- [Generative User Interface](ui_generative_user_interface.md): Stream UI components from tool calls.
- [Message Metadata](ui_message_metadata.md): Attach transient metadata to streamed messages.
- [Reading UIMessage Streams](ui_reading_UIMessage_streams.md): Consume UI message streams on the server (`readUIMessageStream`).
- [Stream Protocol](ui_stream_protocal.md): The UI message stream protocol — chunk types, SSE format, data parts.
- [Completion](ui_completion.md): The `useCompletion` hook.

## Error handling & testing

- [Error Handling](error_handling.md): AI SDK error types and handling patterns.
- [UI Error Handling](ui_error_handling.md): useChat error states and error message parts on the UI layer (Core-level errors live in error_handling.md).
- [Testing](testing.md): Mock providers (`MockLanguageModelV4` etc.) for deterministic tests — **no real provider calls**.

## Recipes

- [Chat with PDFs](nextjs_chat_with_pdfs.md): Chat UI that accepts PDF uploads (provider must support PDFs).
- [Generate Object with File Prompt](nextjs_generate_object_with_file_prompt.md): Structured output from file inputs.
- [Repair Malformed JSON with jsonrepair](repair_malformed_JSON_with_jsonrepair.md): Generate → repair → parse pattern for structured output.

## Other modalities (reference)

- [Image Generation](image_generation.md): Generate images with the SDK.
- [Video Generation](video_generation.md): Generate videos with the SDK.
