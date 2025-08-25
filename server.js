const express = require('express');
// Removed MongoDB/Mongoose in favor of SQLite
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
console.log('Current working directory:',process.cwd());

// Import OpenAI for chatbot functionality
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client with Gemini API configuration
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY, // Use the new Gemini API key from .env
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Use Gemini's compatibility layer URL
});

// Startup diagnostics
console.log('Starting server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`PORT: ${PORT}`);
console.log(`MONGODB_URI set: ${process.env.MONGODB_URI ? 'yes' : 'no'}`);
console.log(`GEMINI_API_KEY set: ${process.env.GEMINI_API_KEY ? 'yes' : 'no'}`); // Check for the new key

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', time: new Date(), env: process.env.NODE_ENV || 'development' });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const { init } = require('./db');
init().then(() => console.log('Lowdb: initialized')).catch(err => console.error('Lowdb initialization error:', err));

// Import routes
const entriesRoutes = require('./routes/entries');
const analyticsRoutes = require('./routes/analytics');

// API routes
app.use('/api/entries', entriesRoutes);
app.use('/api/analytics', analyticsRoutes);

// Real AI-powered chatbot endpoints
app.post('/api/chatbot/analyze-entry/:id', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ 
                error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.' 
            });
        }

        const entryId = req.params.id;
        const { content, mood, activities } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Entry content is required for analysis' });
        }

        const prompt = `Analyze this mental health journal entry and provide helpful insights and recommendations:

Entry: ${content}
Mood: ${mood || 'Not specified'}
Activities: ${activities || 'Not specified'}

Please provide:
1. A brief analysis of the entry
2. 2-3 specific, actionable wellness recommendations
3. Encouraging words or insights

Keep the response warm, supportive, and focused on mental wellness.`;

        const completion = await openai.chat.completions.create({
            model: "gemini-1.5-flash", // Use a Gemini model
            messages: [
                {
                    role: "system",
                    content: "You are a compassionate mental health wellness assistant. Provide supportive, helpful insights and practical recommendations for mental wellness. Always be encouraging and professional."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        });

        const aiInsights = completion.choices[0].message.content;
        
        res.json({ 
            entry: { 
                _id: entryId, 
                aiInsights: aiInsights,
                recommendations: extractRecommendations(aiInsights)
            } 
        });

    } catch (error) {
        console.error('Error analyzing entry:', error);
        res.status(500).json({ 
            error: 'Failed to analyze entry. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/chatbot/chat', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) { // Check for the new key
            return res.status(400).json({ 
                error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.' 
            });
        }

        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const systemPrompt = `You are a compassionate mental health wellness chatbot. Your role is to:
- Provide supportive, encouraging responses
- Offer practical wellness advice and coping strategies
- Help users with stress management, mood improvement, and self-care
- Always maintain a warm, professional, and helpful tone
- If someone is in crisis, encourage them to seek professional help
- Focus on evidence-based wellness practices

Context: ${context || 'General wellness conversation'}`;

        const completion = await openai.chat.completions.create({
            model: "gemini-1.5-flash", // Use a Gemini model
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: message
                }
            ],
            max_tokens: 250,
            temperature: 0.7
        });

        const response = completion.choices[0].message.content;
        res.json({ response });

    } catch (error) {
        console.error('Error getting chatbot response:', error);
        res.status(500).json({ 
            error: 'Failed to get chatbot response. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper function to extract recommendations from AI response
function extractRecommendations(aiInsights) {
    const recommendations = [];
    const lines = aiInsights.split('\n');
    
    for (const line of lines) {
        if (line.includes('recommendation') || line.includes('suggestion') || line.includes('try') || line.includes('consider')) {
            recommendations.push(line.trim());
        }
    }
    
    return recommendations.length > 0 ? recommendations : ['Focus on self-care and mindfulness', 'Consider talking to a trusted friend or professional'];
}

// Serve the main HTML file
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Frontend: http://localhost:${PORT}`);
	console.log(`API: http://localhost:${PORT}/api`);
});