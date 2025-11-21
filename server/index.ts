import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_SERVER_PORT = 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let botServerProcess: ChildProcess | null = null;

function startBotServer() {
  console.log("Starting bot management server...");
  
  botServerProcess = spawn("node", [path.join(__dirname, "ibot.cjs")], {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: __dirname,
  });

  botServerProcess.on("error", (error) => {
    console.error("Bot server error:", error);
  });

  botServerProcess.on("exit", (code) => {
    console.log(`Bot server exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.log("Restarting bot server in 5 seconds...");
      setTimeout(startBotServer, 5000);
    }
  });
}

app.use("/api", async (req: Request, res: Response) => {
  try {
    const targetUrl = `http://localhost:${BOT_SERVER_PORT}${req.url}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...req.headers as Record<string, string>,
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to connect to bot server. Please ensure it's running." 
    });
  }
});

if (process.env.NODE_ENV === "development") {
  const vite = await import("vite");
  const viteDevServer = await vite.createServer({
    server: {
      middlewareMode: true,
      hmr: { server: createServer() },
    },
    appType: "spa",
  });

  app.use(viteDevServer.middlewares);
} else {
  const distPath = path.join(__dirname, "..", "dist", "public");
  app.use(express.static(distPath));
  
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  startBotServer();
});

function gracefulShutdown() {
  console.log("\nShutting down gracefully...");
  
  if (botServerProcess) {
    botServerProcess.kill("SIGTERM");
  }
  
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error("Forced shutdown");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
