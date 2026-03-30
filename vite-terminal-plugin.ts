import type { Plugin } from 'vite';
import { WebSocketServer, type WebSocket } from 'ws';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

export function terminalPlugin(): Plugin {
  return {
    name: 'forge-terminal',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on('upgrade', (request, socket, head) => {
        if (request.url === '/ws/terminal') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws: WebSocket) => {
        const nodeRequire = createRequire(import.meta.url);
        const pty = nodeRequire('node-pty');
        const homeDir = os.homedir();
        let shell = process.env.SHELL || '/bin/zsh';

        if (!fs.existsSync(shell)) {
          for (const fallback of ['/bin/zsh', '/bin/bash', '/bin/sh']) {
            if (fs.existsSync(fallback)) { shell = fallback; break; }
          }
        }

        let ptyProcess: ReturnType<typeof pty.spawn>;
        try {
          ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: homeDir,
            env: {
              ...process.env,
              TERM: 'xterm-256color',
              COLORTERM: 'truecolor',
            },
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: 'output', data: `\r\n\x1b[31mFailed to spawn shell: ${err}\x1b[0m\r\n` }));
          ws.close();
          return;
        }

        ptyProcess.onData((data: string) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'output', data }));
          }
        });

        ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
          }
        });

        ws.on('message', (msg: Buffer) => {
          try {
            const parsed = JSON.parse(msg.toString());
            if (parsed.type === 'input') {
              ptyProcess.write(parsed.data);
            } else if (parsed.type === 'resize') {
              ptyProcess.resize(parsed.cols, parsed.rows);
            }
          } catch {
            ptyProcess.write(msg.toString());
          }
        });

        ws.on('close', () => {
          ptyProcess.kill();
        });
      });
    },
  };
}
