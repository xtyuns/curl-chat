import type { Serve } from "bun";

const config = {
    serverPort: process.env.SERVER_PORT || 3000,
    openai: {
        apiBaseUrl: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY!!.toString(),
        apiModel: process.env.OPENAI_API_MODEL || "gpt-3.5-turbo"
    }
};
console.log('Server will run on port:', config.serverPort)

export default {
    port: config.serverPort,
    fetch: async (req) => {
        const { signal } = req;

        const question = await req.text();
        console.log(new Date(), 'Question:', question);

        return new Response(new ReadableStream({
            async start(controller) {
                signal.onabort = () => {
                    controller.close();
                };

                try {
                    const res = await fetch(`${config.openai.apiBaseUrl}/chat/completions`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${config.openai.apiKey}`
                        },
                        body: JSON.stringify({
                            model: config.openai.apiModel,
                            stream: true,
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a helpful assistant."
                                },
                                {
                                    role: "user",
                                    content: question
                                }
                            ]
                        }),
                        signal: signal
                    })

                    if (res.ok) {
                        const stream = res.body!!.getReader();
                        const decoder = new TextDecoder();
                        let chunk;
                        while (!(chunk = (await stream.read())).done) {
                            const data = decoder.decode(chunk.value);
                            const events = data.split('\n').filter(it => it.length > 0);
                            // console.log(new Date(), events.length, events)
                            for (const event of events) {
                                // console.log(new Date(), 'Event:', event.length, event);
                                const text = event.substring('data: '.length);
                                const json = JSON.parse(text);
                                if (json.choices[0].finish_reason) {
                                    break;
                                }
                                const answer = json.choices[0].delta.content;
                                if (answer?.length > 0) {
                                    controller.enqueue(answer);
                                }
                            }
                        }
                    } else {
                        throw new Error(`${res.status} ${res.statusText}`);
                    }
                } catch (e) {
                    console.error(new Date(), 'Fetch Error', e);
                    if(signal.aborted) {
                        return
                    }
                    controller.enqueue("\nSomething went wrong\n");
                }

                controller.enqueue("\n");
                controller.close();
            },
        }), {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
            }
        })
    }
} satisfies Serve