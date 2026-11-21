import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'clip-api-server',
      configureServer(server) {
        server.middlewares.use('/api/clip', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const processClipRequest = async (url: string, start: number | string, end: number | string, title?: string, quality?: string) => {
            if (!url || start === undefined || end === undefined) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing required parameters: url, start, end' }));
              return;
            }

            const cleanTitle = (title || 'clip').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
            const targetQuality = quality || '4k';
            const tempDir = os.tmpdir();
            const tempFileName = `${cleanTitle}_${Date.now()}.mp4`;
            const tempFilePath = path.join(tempDir, tempFileName);

            const scriptPath = path.resolve(__dirname, 'scripts', 'clip_engine.py');

            console.log(`[clip-api] Processing clip (${targetQuality}): ${url} (${start}s to ${end}s) -> ${tempFilePath}`);

            const pyProc = spawn('python', [
              scriptPath,
              '--url', String(url),
              '--start', String(start),
              '--end', String(end),
              '--output', tempFilePath,
              '--quality', targetQuality
            ]);

            let stderr = '';
            pyProc.stderr.on('data', data => { stderr += data.toString(); });
            pyProc.stdout.on('data', data => { console.log(`[clip_engine] ${data.toString().trim()}`); });

            pyProc.on('close', code => {
              // Find the output file (yt-dlp may add extension or merge)
              let finalFilePath = tempFilePath;
              if (!fs.existsSync(finalFilePath)) {
                // Check if yt-dlp added .mp4 or .webm
                const possible = [
                  tempFilePath + '.mp4',
                  tempFilePath + '.webm',
                  tempFilePath.replace(/\.mp4$/, '') + '.mp4',
                  tempFilePath.replace(/\.mp4$/, '') + '.webm'
                ];
                const found = possible.find(p => fs.existsSync(p));
                if (found) finalFilePath = found;
              }

              if (code !== 0 || !fs.existsSync(finalFilePath)) {
                console.error('[clip-api] Failed with code', code, stderr);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to clip video from URL', details: stderr }));
                return;
              }

              const stat = fs.statSync(finalFilePath);
              const ext = path.extname(finalFilePath) || '.mp4';
              const downloadName = `${cleanTitle}${ext}`;

              res.writeHead(200, {
                'Content-Type': ext === '.webm' ? 'video/webm' : 'video/mp4',
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="${downloadName}"`,
                'Access-Control-Allow-Origin': '*'
              });

              const readStream = fs.createReadStream(finalFilePath);
              readStream.pipe(res);
              readStream.on('end', () => {
                setTimeout(() => {
                  try { if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath); } catch {}
                }, 1000);
              });
            });
          };

          if (req.method === 'GET') {
            const parsedUrl = new URL(req.url || '', 'http://localhost:5173');
            const url = parsedUrl.searchParams.get('url') || '';
            const start = parsedUrl.searchParams.get('start') || '0';
            const end = parsedUrl.searchParams.get('end') || '10';
            const title = parsedUrl.searchParams.get('title') || 'clip';
            const quality = parsedUrl.searchParams.get('quality') || '4k';
            await processClipRequest(url, start, end, title, quality);
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                await processClipRequest(parsed.url, parsed.start, parsed.end, parsed.title, parsed.quality || '4k');
              } catch (e: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid JSON request body' }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
  },
});
