const express = require('express');
const router = express.Router();
const { db, parseRow } = require('../db');
function toClient(entry) {
    const e = parseRow(entry);
    if (!e) return e;
    return { _id: e.id, ...e };
}

const { v4: uuidv4 } = require('uuid');

// Get all entries
router.get('/', async (req, res) => {
    try {
        await db.read();
        const rows = (db.data.entries || []).slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(rows.map(toClient));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching entries' });
    }
});

// Get a specific entry
router.get('/:id', async (req, res) => {
    try {
        await db.read();
        const row = (db.data.entries || []).find(e => e.id === req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json(toClient(row));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching entry' });
    }
});

// Create a new entry
router.post('/', async (req, res) => {
    try {
        const { content, mood, moodScore, tags } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        await db.read();
        db.data.entries ||= [];
        const now = new Date().toISOString();
        const row = {
            id: uuidv4(),
            content,
            mood: mood || 'neutral',
            moodScore: typeof moodScore === 'number' ? moodScore : 5,
            tags: tags || [],
            wellnessScore: 50,
            aiInsights: '',
            recommendations: [],
            createdAt: now,
            updatedAt: now
        };
        db.data.entries.push(row);
        await db.write();
        res.status(201).json(toClient(row));
    } catch (error) {
        res.status(500).json({ error: 'Error creating entry' });
    }
});

// Update an entry
router.put('/:id', async (req, res) => {
    try {
        const { content, mood, moodScore, tags, wellnessScore, aiInsights, recommendations } = req.body;
        await db.read();
        const entries = db.data.entries || [];
        const idx = entries.findIndex(e => e.id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        const now = new Date().toISOString();
        const existing = entries[idx];
        const updated = {
            ...existing,
            content: typeof content !== 'undefined' ? content : existing.content,
            mood: typeof mood !== 'undefined' ? mood : existing.mood,
            moodScore: typeof moodScore !== 'undefined' ? moodScore : existing.moodScore,
            tags: typeof tags !== 'undefined' ? tags : existing.tags,
            wellnessScore: typeof wellnessScore !== 'undefined' ? wellnessScore : existing.wellnessScore,
            aiInsights: typeof aiInsights !== 'undefined' ? aiInsights : existing.aiInsights,
            recommendations: typeof recommendations !== 'undefined' ? recommendations : existing.recommendations,
            updatedAt: now
        };
        entries[idx] = updated;
        await db.write();
        res.json(toClient(updated));
    } catch (error) {
        res.status(500).json({ error: 'Error updating entry' });
    }
});

// Delete an entry
router.delete('/:id', async (req, res) => {
    try {
        await db.read();
        const before = (db.data.entries || []).length;
        db.data.entries = (db.data.entries || []).filter(e => e.id !== req.params.id);
        await db.write();
        const after = db.data.entries.length;
        if (after === before) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting entry' });
    }
});

// Get entries by date range
router.get('/date-range/:start/:end', async (req, res) => {
    try {
        const { start, end } = req.params;
        await db.read();
        const startIso = new Date(start).toISOString();
        const endIso = new Date(end).toISOString();
        const entries = (db.data.entries || [])
            .filter(e => e.createdAt >= startIso && e.createdAt <= endIso)
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(entries.map(toClient));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching entries by date range' });
    }
});

module.exports = router;

