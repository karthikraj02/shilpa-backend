require('dotenv').config();
const app = require('./app');
const net = require('net');

const PORT = process.env.PORT || 5005;

/**
 * Check if a port is in use.
 * Returns the error (with .code === 'EADDRINUSE') if busy, otherwise null.
 */
function checkPort(port) {
    return new Promise((resolve) => {
        const tester = net.createServer();
        tester.once('error', (err) => resolve(err));
        tester.once('listening', () => { tester.close(); resolve(null); });
        tester.listen(port, '0.0.0.0');
    });
}

/**
 * Kill whatever process is holding the port (Windows + Unix).
 */
async function freePort(port) {
    const { execSync } = require('child_process');
    try {
        if (process.platform === 'win32') {
            // Find PID then kill it
            const result = execSync(
                `netstat -ano | findstr :${port}`,
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            const match = result.match(/LISTENING\s+(\d+)/);
            if (match) {
                const pid = match[1];
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                console.log(`[server] Killed process PID ${pid} that was using port ${port}`);
            }
        } else {
            execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
        }
        // Small delay to let OS release the port
        await new Promise(r => setTimeout(r, 500));
    } catch (e) {
        // Ignore errors — port may have been freed already
    }
}

async function startServer() {
    const err = await checkPort(PORT);
    if (err && err.code === 'EADDRINUSE') {
        console.warn(`[server] Port ${PORT} is busy — killing the old process...`);
        await freePort(PORT);
    }

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[server] Port ${PORT} still busy — retrying after cleanup...`);
            await freePort(PORT);
            setTimeout(() => {
                server.close();
                app.listen(PORT, () => console.log(`Server running on port ${PORT} (retry)`));
            }, 1000);
        } else {
            console.error('[server] Fatal error:', err);
            process.exit(1);
        }
    });
}

startServer();
