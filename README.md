# Mental Health Journal & Wellness Chatbot

A comprehensive mental health journal application with an AI-powered wellness chatbot that helps users track their daily thoughts and provides personalized mental wellness insights.

## Features

- **Daily Journal Entries**: Users can write and save their daily thoughts and feelings
- **AI Wellness Analysis**: Gemini-powered chatbot analyzes entries for mental wellness patterns
- **Wellness Insights**: Personalized recommendations and improvement suggestions
- **Mood Tracking**: Visual representation of emotional patterns over time
- **Comprehensive Analytics**: Detailed wellness statistics, trends, and mood analysis
- **Storage**: SQLite database with Lowdb for reliable local storage
- **Responsive Design**: Modern, accessible UI that works on all devices
- **Easy Startup**: Windows batch file for simple application launch

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite with Lowdb adapter
- **AI Integration**: Google Gemini API
- **Additional**: CORS, Body-parser, Moment.js, UUID

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mental-health-journal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Add your Gemini API key (optional but recommended for full functionality):
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     PORT=3000
     NODE_ENV=development
     ```

4. **Start the application**

   **Option 1: Using npm scripts**
   ```bash
   npm run dev    # Development mode with auto-reload
   npm start      # Production mode
   ```

   **Option 2: Windows users (recommended)**
   - Double-click `start.bat` file
   - This will automatically install dependencies and start the app

5. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3000/api`
   - Health Check: `http://localhost:3000/health`

## API Endpoints

### Journal Entries
- `POST /api/entries` - Create a new journal entry
- `GET /api/entries` - Get all journal entries
- `GET /api/entries/:id` - Get a specific journal entry

### AI Chatbot
- `POST /api/chatbot/analyze-entry/:id` - Analyze a journal entry with AI insights

### Analytics
- `GET /api/analytics/overview` - Overall wellness statistics
- `GET /api/analytics/trends?period=30` - Wellness trends over time (default: 30 days)
- `GET /api/analytics/mood-analysis` - Detailed mood analysis and patterns
- `GET /api/analytics/distribution` - Wellness score distribution
- `GET /api/analytics/comparison` - Period comparison analytics

## Project Structure

```
mental-health-journal/
├── public/           # Frontend files (HTML, CSS, JS)
│   ├── index.html    # Main application page
│   ├── styles.css    # Application styling
│   ├── script.js     # Frontend logic
│   └── chatbot.js    # Chatbot interface
├── routes/           # API route handlers
│   ├── entries.js    # Journal entry endpoints
│   └── analytics.js  # Analytics endpoints
├── db.js             # Database initialization and utilities
├── server.js         # Main Express server
├── start.bat         # Windows startup script
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Key Features Explained

### AI Wellness Analysis
The application uses Google's Gemini AI to analyze journal entries and provide:
- Emotional pattern recognition
- Personalized wellness recommendations
- Encouraging insights and support

### Comprehensive Analytics
Track your mental wellness journey with:
- **Overview**: Total entries, average wellness scores, mood distribution
- **Trends**: Wellness patterns over customizable time periods
- **Mood Analysis**: Detailed breakdown of emotional states
- **Distribution**: Wellness score spread and patterns
- **Comparison**: Period-to-period wellness comparisons

### Easy Startup
Windows users can simply double-click `start.bat` to:
- Automatically install dependencies
- Start the development server
- Access the application immediately

## Contributing

Feel free to contribute to this project by:
- Submitting issues for bugs or feature requests
- Creating pull requests with improvements
- Suggesting new wellness features
- Improving the AI analysis capabilities

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues:
1. Check that Node.js is properly installed
2. Verify your `.env` file configuration
3. Ensure all dependencies are installed (`npm install`)
4. Check the console for error messages
5. Open an issue on the project repository

