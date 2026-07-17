async function testGeminiDirect() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  console.log("Calling Gemini API directly with model gemini-3.5-flash...");
  const promptText = "Analyze the video title: 'Epic Sword Fight Animation Reference' and suggest a category, 3 tags, and a short description.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                suggestedCategory: { type: "STRING" },
                isNewCategory: { type: "BOOLEAN" },
                confidence: { type: "NUMBER" },
                reasoning: { type: "STRING" },
                suggestedTags: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                generatedDescription: { type: "STRING" }
              },
              required: ["suggestedCategory", "isNewCategory", "confidence", "reasoning", "suggestedTags", "generatedDescription"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Response text:", textResult);
    if (textResult) {
      console.log("Parsed result:", JSON.parse(textResult));
    }
  } catch (e: any) {
    console.error("Error calling Gemini API:", e.message || e);
  }
}

testGeminiDirect().catch(console.error);
