import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize Gemini with the API key
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateEmbedding(text: string): Promise<number[]> {
	if (!apiKey) {
		console.warn('GEMINI_API_KEY is not set. Returning zero embedding.');
		return new Array(1536).fill(0);
	}

	try {
		const model = genAI.getGenerativeModel({ model: 'embedding-001' });
		const result = await model.embedContent(text);
		const embedding = result.embedding;
		return embedding.values;
	} catch (error) {
		console.error('Error generating embedding:', error);
		// Return empty embedding or throw based on requirements
		return new Array(1536).fill(0);
	}
}
