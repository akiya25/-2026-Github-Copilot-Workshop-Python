import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const app = express();

// CORS: フロントエンド (port 5173) からの接続を許可
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false,
});

// デバッグ用エンドポイント
app.get("/debug/status", (req, res) => {
  res.json({
    status: "ok",
    websocket: "ready",
    copilotClient: "initializing",
  });
});

app.get("/debug/info", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Debug Info</title></head>
    <body style="background: #0d1117; color: #e6edf3; font-family: monospace; padding: 20px;">
      <h1>🔧 Copilot Chat - Debug Info</h1>
      <p>✅ Backend is running</p>
      <p>✅ WebSocket server is configured</p>
      <p>🔗 WebSocket endpoint: ws://localhost:3001</p>
      <p>📊 Try connecting: <a href="http://localhost:5173" style="color: #1f6feb;">Open App</a></p>
    </body>
    </html>
  `);
});

const copilotClient = new CopilotClient();

async function main() {
  await copilotClient.start();
  console.log("Copilot client started");

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected");
    let session: any = null;

    const setupSession = async () => {
      try {
        // gpt-5 が利用不可の場合は環境変数 COPILOT_MODEL で上書き可能
        // 利用可能なモデル例: gpt-5.4, gpt-5.4-mini, gpt-5-mini, claude-sonnet-4.6
        const model = process.env.COPILOT_MODEL || "gpt-5.4";
        console.log(`Creating session with model: ${model}`);
        session = await copilotClient.createSession({
          model,
          streaming: true,
          onPermissionRequest: approveAll,
        });

        console.log("Session created successfully");

        session.on("assistant.message_delta", (event: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "delta", content: event.data.deltaContent }));
          }
        });

        session.on("session.idle", () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "done" }));
          }
        });
      } catch (err: any) {
        console.error("Session setup error:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
      }
    };

    setupSession();

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "chat" && session) {
          await session.send({ prompt: msg.content });
        }
      } catch (err: any) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
      }
    });

    ws.on("close", async () => {
      console.log("Client disconnected");
      if (session) {
        await session.disconnect().catch(console.error);
      }
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
