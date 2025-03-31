import { generateText, jsonSchema, tool } from "ai";
import { openai } from "@ai-sdk/openai";

const apiKey = process.env.BYTECHEF_API_KEY;

const response = await fetch(
    "http://localhost:9555/api/embedded/v1/tools?externalUserId=12345",
    {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    }
);

const integrationTools = await response.json();

await generateText({
    model: openai("gpt-4o"),
    tools: Object.fromEntries(
        integrationTools.map((integrationTool) => [
            integrationTool.function.name,
            tool({
                description: integrationTool.function.description,
                parameters: jsonSchema(integrationTool.function.parameters),
                execute: async (params: any, { toolCallId }) => {
                    try {
                        const response = await fetch(
                            `http://localhost:9555/api/embedded/v1/tools?externalUserId=12345`,
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    action: integrationTool.function.name,
                                    parameters: params,
                                }),
                                headers: {
                                    Authorization: `Bearer ${apiKey}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        );

                        const output = await response.json();

                        if (!response.ok) {
                            throw new Error(JSON.stringify(output, null, 2));
                        }

                        return output;
                    } catch (err) {
                        if (err instanceof Error) {
                            return { error: { message: err.message } };
                        }

                        return err;
                    }
                },
            }),
        ])
    ),
    toolChoice: "auto",
    temperature: 0,
    system: "You are a helpful assistant. Be as concise as possible.",
    prompt: "Help me create a new task in Jira.",
});