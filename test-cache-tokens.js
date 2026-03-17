require('dotenv').config({ path: '.env.local' });
const { GoogleAICacheManager } = require("@google/generative-ai/server");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const cacheManager = new GoogleAICacheManager(apiKey);

async function testCache() {
    try {
        const cache = await cacheManager.create({
            model: "models/gemini-2.0-flash",
            displayName: "Test Cache",
            contents: [
                {
                    role: "user",
                    parts: [{ text: "Hello, this is a short context block." }]
                }
            ],
            ttlSeconds: 300
        });
        console.log("Success:", cache.name);
    } catch (e) {
        console.error("Error creating cache:", e.message);
    }
}
testCache();
