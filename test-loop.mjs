import fetch from 'node-fetch';

async function testInfiniteLoopEndpoint() {
    const res = await fetch("http://localhost:3000/api/generate-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            exerciseId: "safety-test-id",
            exerciseName: "Jumping Jacks",
            description: "Jump up and down.",
            gender: "diverse",
            age: 30
        })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}

testInfiniteLoopEndpoint();
