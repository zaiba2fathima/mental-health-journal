// Global variables
let currentEntries = [];
let currentTab = 'journal';

// DOM elements
const tabButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const journalForm = document.getElementById('journalForm');
const entriesList = document.getElementById('entriesList');
const chatForm = document.getElementById('chatForm');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const moodScoreInput = document.getElementById('moodScore');
const scoreDisplay = document.querySelector('.score-display');
const loadingModal = document.getElementById('loadingModal');
const entryModal = document.getElementById('entryModal');
const entryModalContent = document.getElementById('entryModalContent');

// API base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadEntries();
    loadAnalytics();
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Journal form
    journalForm.addEventListener('submit', handleJournalSubmit);

    // Chat form
    chatForm.addEventListener('submit', handleChatSubmit);

    // Mood score slider
    moodScoreInput.addEventListener('input', (e) => {
        scoreDisplay.textContent = e.target.value;
    });

    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            entryModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === entryModal) {
            entryModal.style.display = 'none';
        }
    });
}

// Tab Navigation
function switchTab(tabName) {
    // Update active tab button
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update active tab content
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    currentTab = tabName;

    // Load data for the selected tab
    if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'journal') {
        loadEntries();
    }
}

// Journal Functions
async function handleJournalSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(journalForm);
    const entryData = {
        content: formData.get('content'),
        mood: formData.get('mood'),
        moodScore: parseInt(formData.get('moodScore')),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
    };

    try {
        showLoading();
        
        // Create entry
        const response = await fetch(`${API_BASE}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            throw new Error('Failed to create entry');
        }

        const entry = await response.json();
        
        // Reset form and reload entries
        journalForm.reset();
        scoreDisplay.textContent = '5';
        await loadEntries();
        
        // Show success message
        showNotification('Journal entry saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving entry:', error);
        showNotification('Failed to save entry. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function loadEntries() {
    try {
        const response = await fetch(`${API_BASE}/entries`);
        if (!response.ok) {
            throw new Error('Failed to load entries');
        }
        
        currentEntries = await response.json();
        displayEntries(currentEntries);
        
    } catch (error) {
        console.error('Error loading entries:', error);
        showNotification('Failed to load entries.', 'error');
    }
}

function displayEntries(entries) {
    if (entries.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>No journal entries yet. Start writing to begin your wellness journey!</p>
            </div>
        `;
        return;
    }

    entriesList.innerHTML = entries.map(entry => `
        <div class="entry-card" onclick="showEntryDetails('${entry._id}')">
            <div class="entry-header">
                <span class="entry-date">${formatDate(entry.createdAt)}</span>
                <div class="entry-mood">
                    <span class="mood-badge mood-${entry.mood}">${entry.mood}</span>
                    <span>${entry.moodScore}/10</span>
                </div>
            </div>
            <div class="entry-content">
                ${entry.content.length > 150 ? entry.content.substring(0, 150) + '...' : entry.content}
            </div>
            ${entry.tags.length > 0 ? `
                <div class="entry-tags">
                    ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${entry.wellnessScore ? `
                <div class="wellness-score">
                    <strong>Wellness Score:</strong> ${entry.wellnessScore}/100
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function showEntryDetails(entryId) {
    try {
        const entry = currentEntries.find(e => e._id === entryId);
        if (!entry) return;

        entryModalContent.innerHTML = `
            <div class="entry-details">
                <h2>Journal Entry Details</h2>
                <div class="entry-meta">
                    <p><strong>Date:</strong> ${formatDate(entry.createdAt)}</p>
                    <p><strong>Mood:</strong> ${entry.mood} (${entry.moodScore}/10)</p>
                    ${entry.tags.length > 0 ? `<p><strong>Tags:</strong> ${entry.tags.join(', ')}</p>` : ''}
                </div>
                <div class="entry-full-content">
                    <h3>Your Entry:</h3>
                    <p>${entry.content}</p>
                </div>
                ${entry.aiInsights ? `
                    <div class="ai-insights">
                        <h3>AI Wellness Insights:</h3>
                        <p>${entry.aiInsights}</p>
                        ${entry.recommendations && entry.recommendations.length > 0 ? `
                            <h4>Recommendations:</h4>
                            <ul>
                                ${entry.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="entry-actions">
                    <button class="btn btn-secondary" onclick="deleteEntry('${entry._id}')">
                        <i class="fas fa-trash"></i>
                        Delete Entry
                    </button>
                </div>
            </div>
        `;

        entryModal.style.display = 'block';
        
    } catch (error) {
        console.error('Error showing entry details:', error);
    }
}

async function analyzeEntry(entryId) {
    try {
        showLoading();
        
        // Get the entry data to send for analysis
        const entry = currentEntries.find(e => e._id === entryId);
        if (!entry) {
            throw new Error('Entry not found');
        }
        
        const response = await fetch(`${API_BASE}/chatbot/analyze-entry/${entryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: entry.content,
                mood: entry.mood,
                activities: entry.activities
            })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze entry');
        }

        const result = await response.json();
        
        // Update the entry in the list
        const entryIndex = currentEntries.findIndex(e => e._id === entryId);
        if (entryIndex !== -1) {
            currentEntries[entryIndex] = result.entry;
        }
        
        // Refresh the display
        displayEntries(currentEntries);
        
        // Close modal and show updated entry
        entryModal.style.display = 'none';
        showEntryDetails(entryId);
        
        showNotification('Entry analyzed successfully!', 'success');
        
    } catch (error) {
        console.error('Error analyzing entry:', error);
        showNotification('Failed to analyze entry.', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/entries/${entryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete entry');
        }

        // Remove from current entries and refresh
        currentEntries = currentEntries.filter(e => e._id !== entryId);
        displayEntries(currentEntries);
        
        // Close modal
        entryModal.style.display = 'none';
        
        showNotification('Entry deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting entry:', error);
        showNotification('Failed to delete entry.', 'error');
    }
}

// Chatbot Functions
async function handleChatSubmit(e) {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');
    chatInput.value = '';

    try {
        // Send message to chatbot
        const response = await fetch(`${API_BASE}/chatbot/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                context: 'User is seeking wellness guidance'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get chatbot response');
        }

        const result = await response.json();
        
        // Add bot response to chat
        addChatMessage(result.response, 'bot');
        
    } catch (error) {
        console.error('Error getting chatbot response:', error);
        addChatMessage('Sorry, I\'m having trouble responding right now. Please try again later.', 'bot');
    }
}

function addChatMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>'}
            <p>${content}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Analytics Functions
async function loadAnalytics() {
    try {
        // Load overview stats
        const overviewResponse = await fetch(`${API_BASE}/analytics/overview`);
        if (overviewResponse.ok) {
            const overview = await overviewResponse.json();
            displayOverviewStats(overview);
        }

        // Load wellness trends
        const trendsResponse = await fetch(`${API_BASE}/analytics/trends?period=30`);
        if (trendsResponse.ok) {
            const trends = await trendsResponse.json();
            displayWellnessTrends(trends);
        }

        // Load mood analysis
        const moodResponse = await fetch(`${API_BASE}/analytics/mood-analysis`);
        if (moodResponse.ok) {
            const moodData = await moodResponse.json();
            displayMoodAnalysis(moodData);
        }

        // Load weekly comparison
        const comparisonResponse = await fetch(`${API_BASE}/analytics/comparison`);
        if (comparisonResponse.ok) {
            const comparison = await comparisonResponse.json();
            displayWeeklyComparison(comparison);
        }

    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function displayOverviewStats(data) {
    const overviewStats = document.getElementById('overviewStats');
    if (!overviewStats) return;

    overviewStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${data.totalEntries}</div>
            <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${Math.round(data.avgWellnessScore)}</div>
            <div class="stat-label">Avg Wellness</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${data.recentEntries}</div>
            <div class="stat-label">This Week</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${data.moodDistribution.length > 0 ? data.moodDistribution[0]._id : 'N/A'}</div>
            <div class="stat-label">Top Mood</div>
        </div>
    `;
}

function displayWellnessTrends(trends) {
    const trendsChart = document.getElementById('wellnessTrends');
    if (!trendsChart || trends.length === 0) return;

    const chartData = trends.map(trend => ({
        date: trend._id,
        wellness: Math.round(trend.avgWellness || 0),
        mood: Math.round(trend.avgMood || 0)
    }));

    trendsChart.innerHTML = `
        <div class="trends-container">
            <h4>Last 30 Days</h4>
            <div class="trends-list">
                ${chartData.map(trend => `
                    <div class="trend-item">
                        <span class="trend-date">${formatDate(trend.date)}</span>
                        <div class="trend-bars">
                            <div class="trend-bar wellness" style="width: ${trend.wellness}%"></div>
                            <div class="trend-bar mood" style="width: ${trend.mood * 10}%"></div>
                        </div>
                        <span class="trend-scores">
                            W: ${trend.wellness} | M: ${trend.mood}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function displayMoodAnalysis(moodData) {
    const moodChart = document.getElementById('moodAnalysis');
    if (!moodChart) return;

    const totalEntries = moodData.moodStats.reduce((sum, stat) => sum + stat.count, 0);
    
    moodChart.innerHTML = `
        <div class="mood-container">
            <div class="mood-stats">
                ${moodData.moodStats.map(stat => `
                    <div class="mood-stat">
                        <div class="mood-label">${stat._id}</div>
                        <div class="mood-bar">
                            <div class="mood-fill" style="width: ${(stat.count / totalEntries) * 100}%"></div>
                        </div>
                        <div class="mood-count">${stat.count}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function displayWeeklyComparison(comparison) {
    const comparisonChart = document.getElementById('weeklyComparison');
    if (!comparisonChart) return;

    comparisonChart.innerHTML = `
        <div class="comparison-container">
            <div class="comparison-item">
                <h4>Wellness Score</h4>
                <div class="comparison-values">
                    <span class="current">${Math.round(comparison.wellness.thisWeek)}</span>
                    <span class="change ${comparison.wellness.change >= 0 ? 'positive' : 'negative'}">
                        ${comparison.wellness.change >= 0 ? '+' : ''}${comparison.wellness.change}%
                    </span>
                </div>
            </div>
            <div class="comparison-item">
                <h4>Mood Score</h4>
                <div class="comparison-values">
                    <span class="current">${Math.round(comparison.mood.thisWeek)}</span>
                    <span class="change ${comparison.mood.change >= 0 ? 'positive' : 'negative'}">
                        ${comparison.mood.change >= 0 ? '+' : ''}${comparison.mood.change}%
                    </span>
                </div>
            </div>
            <div class="comparison-item">
                <h4>Entries</h4>
                <div class="comparison-values">
                    <span class="current">${comparison.entries.thisWeek}</span>
                    <span class="change ${comparison.entries.change >= 0 ? 'positive' : 'negative'}">
                        ${comparison.entries.change >= 0 ? '+' : ''}${comparison.entries.change}%
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function showLoading() {
    loadingModal.style.display = 'block';
}

function hideLoading() {
    loadingModal.style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .trends-container {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .trend-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .trend-date {
        min-width: 80px;
        font-size: 0.9rem;
    }
    
    .trend-bars {
        flex: 1;
        display: flex;
        gap: 0.5rem;
        height: 20px;
    }
    
    .trend-bar {
        height: 100%;
        border-radius: 10px;
        min-width: 20px;
    }
    
    .trend-bar.wellness {
        background: #667eea;
    }
    
    .trend-bar.mood {
        background: #ff6b6b;
    }
    
    .trend-scores {
        font-size: 0.8rem;
        color: #666;
        min-width: 60px;
    }
    
    .mood-stats {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .mood-stat {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .mood-label {
        min-width: 80px;
        font-weight: 600;
    }
    
    .mood-bar {
        flex: 1;
        height: 20px;
        background: #e9ecef;
        border-radius: 10px;
        overflow: hidden;
    }
    
    .mood-fill {
        height: 100%;
        background: #667eea;
        transition: width 0.3s ease;
    }
    
    .mood-count {
        min-width: 40px;
        text-align: right;
        font-weight: 600;
    }
    
    .comparison-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .comparison-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .comparison-item h4 {
        margin: 0;
        color: #333;
    }
    
    .comparison-values {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .current {
        font-size: 1.5rem;
        font-weight: 700;
        color: #667eea;
    }
    
    .change {
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.9rem;
        font-weight: 600;
    }
    
    .change.positive {
        background: #d4edda;
        color: #155724;
    }
    
    .change.negative {
        background: #f8d7da;
        color: #721c24;
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: #666;
    }
    
    .entry-details {
        max-width: 100%;
    }
    
    .entry-meta {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
    
    .entry-meta p {
        margin-bottom: 0.5rem;
    }
    
    .entry-full-content {
        margin-bottom: 1.5rem;
    }
    
    .entry-full-content h3 {
        margin-bottom: 0.5rem;
        color: #333;
    }
    
    .ai-insights {
        background: #e3f2fd;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border-left: 4px solid #2196f3;
    }
    
    .ai-insights h3 {
        color: #1976d2;
        margin-bottom: 1rem;
    }
    
    .ai-insights h4 {
        color: #1976d2;
        margin: 1rem 0 0.5rem;
    }
    
    .ai-insights ul {
        margin-left: 1.5rem;
    }
    
    .ai-analysis {
        text-align: center;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
    
    .wellness-score {
        background: #e8f5e8;
        color: #2e7d32;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        margin-top: 1rem;
    }
`;
document.head.appendChild(style);




