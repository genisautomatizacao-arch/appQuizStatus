const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json({ limit: '50mb' }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Custom route for health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint to save equipment data to equipments.json
app.post('/save-equipments', (req, res) => {
    const newData = req.body;
    const filePath = path.join(__dirname, 'equipments.json');

    if (!Array.isArray(newData)) {
        return res.status(400).json({ error: 'Data must be an array' });
    }

    fs.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error saving equipments:', err);
            return res.status(500).json({ error: 'Failed to save data to file' });
        }
        console.log('✅ equipments.json updated successfully');
        res.status(200).json({ message: 'Success' });
    });
});

// Fallback to index.html for PWA/SPA routing
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Quiz App running at http://0.0.0.0:${PORT}`);
});
