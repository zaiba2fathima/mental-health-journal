const express = require('express');
const router = express.Router();
const { db, parseRow } = require('../db');
const moment = require('moment');

// Get overall wellness statistics
router.get('/overview', async (req, res) => {
    try {
        await db.read();
        const entries = db.data.entries || [];
        const total = entries.length;
        const avgWellness = total ? entries.reduce((s,e)=>s+(e.wellnessScore||0),0)/total : 0;
        const moodMap = new Map();
        for (const e of entries) moodMap.set(e.mood, (moodMap.get(e.mood)||0)+1);
        const moodRows = Array.from(moodMap.entries()).map(([mood,count])=>({_id:mood,count})).sort((a,b)=>b.count-a.count);
        const recent = entries.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,7);
        const since = moment().subtract(7, 'days');
        const group = new Map();
        for (const e of entries) {
            if (moment(e.createdAt).isBefore(since)) continue;
            const key = moment(e.createdAt).format('YYYY-MM-DD');
            if (!group.has(key)) group.set(key, []);
            group.get(key).push(e);
        }
        const weeklyRows = Array.from(group.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,arr])=>({
            _id: d,
            avgWellness: arr.reduce((s,e)=>s+(e.wellnessScore||0),0)/arr.length,
            avgMood: arr.reduce((s,e)=>s+(e.moodScore||0),0)/arr.length,
            count: arr.length
        }));

        res.json({
            totalEntries: total,
            avgWellnessScore: avgWellness,
            moodDistribution: moodRows,
            weeklyTrend: weeklyRows,
            recentEntries: recent.length
        });

    } catch (error) {
        res.status(500).json({ error: 'Error fetching analytics overview' });
    }
});

// Get wellness trends over time
router.get('/trends', async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        await db.read();
        const entries = db.data.entries || [];
        const start = moment().subtract(parseInt(period), 'days');
        const map = new Map();
        for (const e of entries) {
            if (moment(e.createdAt).isBefore(start)) continue;
            const key = moment(e.createdAt).format('YYYY-MM-DD');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(e);
        }
        const rows = Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,arr])=>({
            _id: d,
            avgWellness: arr.reduce((s,e)=>s+(e.wellnessScore||0),0)/arr.length,
            avgMood: arr.reduce((s,e)=>s+(e.moodScore||0),0)/arr.length,
            entryCount: arr.length
        }));
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching trends' });
    }
});

// Get mood analysis
router.get('/mood-analysis', async (req, res) => {
    try {
        await db.read();
        const entries = db.data.entries || [];
        const statsMap = new Map();
        for (const e of entries) {
            const k = e.mood;
            if (!statsMap.has(k)) statsMap.set(k, []);
            statsMap.get(k).push(e);
        }
        const moodStats = Array.from(statsMap.entries()).map(([mood, arr])=>({
            _id: mood,
            count: arr.length,
            avgWellness: arr.reduce((s,e)=>s+(e.wellnessScore||0),0)/arr.length,
            avgScore: arr.reduce((s,e)=>s+(e.moodScore||0),0)/arr.length,
        })).sort((a,b)=>b.count-a.count);

        const weekMap = new Map();
        for (const e of entries) {
            const year = moment(e.createdAt).format('YYYY');
            const week = moment(e.createdAt).format('WW');
            const key = `${e.mood}:${year}:${week}`;
            weekMap.set(key, (weekMap.get(key)||0)+1);
        }
        const moodTrends = Array.from(weekMap.entries()).map(([key,count])=>{
            const [mood,year,week] = key.split(':');
            return { mood, year, week, count };
        }).sort((a,b)=> a.year === b.year ? a.week.localeCompare(b.week) : a.year.localeCompare(b.year));

        res.json({ moodStats, moodTrends });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching mood analysis' });
    }
});

// Get wellness score distribution
router.get('/wellness-distribution', async (req, res) => {
    try {
        await db.read();
        const buckets = [0, 20, 40, 60, 80, 100];
        const totalCount = (db.data.entries || []).length;
        const ranges = [
            { range: '0-20', label: 'Needs Support', color: '#ff6b6b' },
            { range: '21-40', label: 'Room for Improvement', color: '#ffa726' },
            { range: '41-60', label: 'Moderate Wellness', color: '#ffd54f' },
            { range: '61-80', label: 'Good Wellness', color: '#81c784' },
            { range: '81-100', label: 'Excellent Wellness', color: '#4caf50' }
        ];
        const results = [];
        for (let i = 0; i < ranges.length; i++) {
            const low = buckets[i];
            const high = buckets[i+1];
            const count = (db.data.entries || []).filter(e => e.wellnessScore >= low && e.wellnessScore < high).length;
            const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';
            results.push({
                range: ranges[i].range,
                label: ranges[i].label,
                color: ranges[i].color,
                count,
                percentage
            });
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching wellness distribution' });
    }
});

// Get entry patterns and insights
router.get('/patterns', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        await db.read();
        const startIso = moment().subtract(parseInt(days), 'days').toISOString();
        const entries = (db.data.entries || []).filter(e => e.createdAt >= startIso).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(parseRow);
        const avgEntryLength = entries.length ? Math.round(entries.reduce((sum, e) => sum + (e.content?.length || 0), 0) / entries.length) : 0;

        // common tags
        const tagCounts = new Map();
        entries.forEach(e => {
            (e.tags || []).forEach(t => {
                tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
            });
        });
        const commonTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ _id: tag, count }));

        // hourly distribution
        const hourly = new Array(24).fill(0);
        entries.forEach(e => { hourly[new Date(e.createdAt).getHours()]++; });
        const hourlyDistribution = hourly.map((count, hour) => ({ _id: hour, count }));

        // day-of-week distribution (1-7 like Mongo $dayOfWeek)
        const dow = new Array(7).fill(0);
        entries.forEach(e => { dow[new Date(e.createdAt).getDay()]++; });
        const dayOfWeekDistribution = dow.map((count, idx) => ({ _id: idx === 0 ? 7 : idx, count }));

        res.json({
            avgEntryLength,
            commonTags,
            hourlyDistribution,
            dayOfWeekDistribution,
            totalEntries: entries.length,
            period: `${days} days`
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching patterns' });
    }
});

// Get comparison data (e.g., this week vs last week)
router.get('/comparison', async (req, res) => {
    try {
        const now = moment();
        const thisWeek = {
            start: now.clone().startOf('week'),
            end: now.clone().endOf('week')
        };
        const lastWeek = {
            start: now.clone().subtract(1, 'week').startOf('week'),
            end: now.clone().subtract(1, 'week').endOf('week')
        };

        await db.read();
        const entries = db.data.entries || [];

        function aggregateForRange(startMoment, endMoment) {
            const inRange = entries.filter(e => {
                const d = moment(e.createdAt);
                return d.isSameOrAfter(startMoment) && d.isSameOrBefore(endMoment);
            });
            const count = inRange.length;
            const avgWellness = count ? inRange.reduce((s, e) => s + (e.wellnessScore || 0), 0) / count : 0;
            const avgMood = count ? inRange.reduce((s, e) => s + (e.moodScore || 0), 0) / count : 0;
            return { avgWellness, avgMood, count };
        }

        const thisWeekStats = aggregateForRange(thisWeek.start, thisWeek.end);
        const lastWeekStats = aggregateForRange(lastWeek.start, lastWeek.end);

        const pct = (a, b) => (b && b !== 0) ? Number(((a - b) / b * 100).toFixed(1)) : 0;

        res.json({
            wellness: {
                thisWeek: thisWeekStats.avgWellness || 0,
                lastWeek: lastWeekStats.avgWellness || 0,
                change: pct(thisWeekStats.avgWellness || 0, lastWeekStats.avgWellness || 0)
            },
            mood: {
                thisWeek: thisWeekStats.avgMood || 0,
                lastWeek: lastWeekStats.avgMood || 0,
                change: pct(thisWeekStats.avgMood || 0, lastWeekStats.avgMood || 0)
            },
            entries: {
                thisWeek: thisWeekStats.count || 0,
                lastWeek: lastWeekStats.count || 0,
                change: pct(thisWeekStats.count || 0, lastWeekStats.count || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching comparison data' });
    }
});

module.exports = router;
