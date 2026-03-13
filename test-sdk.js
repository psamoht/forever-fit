require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkImagen() {
    try {
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
        const result = await model.generateContent("A picture of a dog");
        console.log(result.response.text());
    } catch(e) {
        console.error("SDK Error:", e.message);
    }
}
checkImagen();
