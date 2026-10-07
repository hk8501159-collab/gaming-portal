import express from "express";
import { MongoClient } from "mongodb";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const defaultMongodPath = path.join(
  process.env.USERPROFILE || process.cwd(),
  "Documents",
  "Codex",
  "tools",
  "node-mongodb-vscode",
  "mongodb",
  "bin",
  "mongod.exe"
);
const mongodPath = process.env.MONGOD_PATH || defaultMongodPath;
const databaseName = "playroom_portal";
const folder = path.dirname(fileURLToPath(import.meta.url));
const publicFolder = path.join(folder, "public");
const mongoDataFolder = path.join(folder, "data", "db");
const demoEmail = "player@playroom.test";
const demoPassword = "playroom123";
const sessionCookie = "playroom_session";
const sessionLifetimeMs = 8 * 60 * 60 * 1000;

const starterGames = [
  { slug: "starlight-run", title: "Starlight Run", genre: "Arcade", description: "Race through a neon galaxy.", players: "8.4k", rating: "4.9", icon: "🚀", theme: "cosmic", launches: 0 },
  { slug: "mossy-mystery", title: "Mossy Mystery", genre: "Adventure", description: "Explore a tiny enchanted forest.", players: "5.2k", rating: "4.8", icon: "🍄", theme: "forest", launches: 0 },
  { slug: "pixel-rally", title: "Pixel Rally", genre: "Racing", description: "Drift fast. Find your own line.", players: "3.7k", rating: "4.7", icon: "🏎️", theme: "sunset", launches: 0 },
  { slug: "brain-garden", title: "Brain Garden", genre: "Puzzle", description: "Give your brain a playful workout.", players: "2.1k", rating: "4.8", icon: "🧩", theme: "garden", launches: 0 },
  { slug: "cloud-keepers", title: "Cloud Keepers", genre: "Adventure", description: "Build a home above the clouds.", players: "1.8k", rating: "4.6", icon: "☁️", theme: "sky", launches: 0 },
  { slug: "tiny-duel", title: "Tiny Duel", genre: "Arcade", description: "A quick little challenge for two.", players: "950", rating: "4.5", icon: "⚔️", theme: "berry", launches: 0 }
];
const memoryGames = starterGames.map((game) => ({ ...game }));
const memorySessions = new Map();

let gameCollection = null;
let userCollection = null;
let sessionCollection = null;
let mongoClient = null;
let memoryDemoUser = null;
let databaseStatus = "connecting";
let mongoProcess = null;
let httpServer = null;
let reconnectTimer = null;
let mongoErrorLogged = false;

app.use(express.json());

function escapeRegex(value) {
  return String(value).replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function publicUser(user) {
  return { name: user.name, email: user.email };
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie || "").split(";");
  const entry = cookies.find((cookie) => cookie.trim().startsWith(name + "="));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : "";
}

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    sessionCookie + "=" + encodeURIComponent(token) + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800"
  );
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", sessionCookie + "=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

async function makePasswordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return { passwordSalt: salt, passwordHash: Buffer.from(derived).toString("hex") };
}

async function passwordMatches(password, user) {
  if (!user || !user.passwordSalt || !user.passwordHash) return false;
  const derived = Buffer.from(await scrypt(password, user.passwordSalt, 64));
  const expected = Buffer.from(user.passwordHash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

async function findSessionUser(request) {
  const token = readCookie(request, sessionCookie);
  if (!token) return null;
  const tokenHash = hashToken(token);

  if (sessionCollection && userCollection) {
    try {
      const session = await sessionCollection.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
      });
      if (session) {
        const user = await userCollection.findOne({ _id: session.userId });
        if (user) return publicUser(user);
      }
    } catch (_error) {
      // A saved in-memory session can still be used while MongoDB reconnects.
    }
  }

  const memorySession = memorySessions.get(tokenHash);
  if (!memorySession) return null;
  if (memorySession.expiresAt <= Date.now()) {
    memorySessions.delete(tokenHash);
    return null;
  }
  return memorySession.user;
}

async function requireLogin(request, response, next) {
  try {
    const user = await findSessionUser(request);
    if (!user) {
      if (request.path.startsWith("/api/")) {
        response.status(401).json({ error: "Please sign in first." });
      } else {
        response.redirect("/");
      }
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function startLocalMongo() {
  if (process.env.MONGODB_URI) return;
  try {
    await mkdir(mongoDataFolder, { recursive: true });
    mongoProcess = spawn(mongodPath, ["--dbpath", mongoDataFolder, "--bind_ip", "127.0.0.1"], {
      stdio: "ignore",
      windowsHide: true
    });
    mongoProcess.on("error", (error) => {
      if (!mongoErrorLogged) {
        console.log("Local MongoDB could not start: " + error.message);
        console.log("The portal can still be tried with its demo login.");
        mongoErrorLogged = true;
      }
    });
  } catch (error) {
    console.log("Local MongoDB setup issue: " + error.message);
  }
}

async function connectMongo() {
  const candidate = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 1500 });
  try {
    await candidate.connect();
    const database = candidate.db(databaseName);
    const games = database.collection("games");
    const users = database.collection("users");
    const sessions = database.collection("sessions");

    if (await games.countDocuments() === 0) {
      await games.insertMany(starterGames);
    }
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    let demoUser = await users.findOne({ email: demoEmail });
    if (!demoUser) {
      demoUser = { ...memoryDemoUser, createdAt: new Date() };
      const savedUser = await users.insertOne(demoUser);
      demoUser._id = savedUser.insertedId;
    }

    mongoClient = candidate;
    gameCollection = games;
    userCollection = users;
    sessionCollection = sessions;
    databaseStatus = "connected";
    console.log("MongoDB connected: " + databaseName);
  } catch (_error) {
    await candidate.close().catch(() => {});
    gameCollection = null;
    userCollection = null;
    sessionCollection = null;
    databaseStatus = "demo";
    if (!mongoErrorLogged) {
      console.log("Waiting for MongoDB. Login and portal are available in demo mode meanwhile.");
      mongoErrorLogged = true;
    }
    reconnectTimer = setTimeout(connectMongo, 3000);
    reconnectTimer.unref();
  }
}

function matchesGame(game, search, genre) {
  const matchesGenre = !genre || genre === "All games" || game.genre === genre;
  const matchesSearch = !search || game.title.toLowerCase().includes(search.toLowerCase());
  return matchesGenre && matchesSearch;
}

app.get("/", async (request, response, next) => {
  try {
    if (await findSessionUser(request)) {
      response.redirect("/portal.html");
      return;
    }
    response.sendFile(path.join(publicFolder, "index.html"));
  } catch (error) {
    next(error);
  }
});

app.get("/portal.html", requireLogin, (_request, response) => {
  response.sendFile(path.join(publicFolder, "portal.html"));
});

app.use(express.static(publicFolder, { index: false }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    database: databaseStatus,
    message: databaseStatus === "connected" ? "MongoDB connected" : "Demo login ready; waiting for MongoDB"
  });
});

app.get("/api/auth/me", async (request, response, next) => {
  try {
    const user = await findSessionUser(request);
    response.json({ authenticated: Boolean(user), user: user || null });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "");
    if (!email || !password) {
      response.status(400).json({ error: "Enter your email and password." });
      return;
    }

    let user = null;
    if (userCollection) user = await userCollection.findOne({ email });
    if (!user && email === demoEmail) user = memoryDemoUser;
    if (!await passwordMatches(password, user)) {
      response.status(401).json({ error: "That email and password do not match." });
      return;
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    if (sessionCollection && user._id) {
      await sessionCollection.insertOne({ tokenHash, userId: user._id, expiresAt });
    } else {
      memorySessions.set(tokenHash, { user: publicUser(user), expiresAt: expiresAt.getTime() });
    }
    setSessionCookie(response, token);
    response.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    const token = readCookie(request, sessionCookie);
    if (token) {
      const tokenHash = hashToken(token);
      memorySessions.delete(tokenHash);
      if (sessionCollection) await sessionCollection.deleteOne({ tokenHash });
    }
    clearSessionCookie(response);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/games", requireLogin, async (request, response, next) => {
  try {
    const search = String(request.query.search || "").trim();
    const genre = String(request.query.genre || "All games");
    let games;
    if (gameCollection) {
      const filter = {};
      if (genre !== "All games") filter.genre = genre;
      if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };
      games = await gameCollection.find(filter).sort({ title: 1 }).toArray();
    } else {
      games = memoryGames.filter((game) => matchesGame(game, search, genre));
    }
    response.json(games);
  } catch (error) {
    next(error);
  }
});

app.post("/api/games/:slug/play", requireLogin, async (request, response, next) => {
  try {
    let game;
    if (gameCollection) {
      await gameCollection.updateOne({ slug: request.params.slug }, { $inc: { launches: 1 } });
      game = await gameCollection.findOne({ slug: request.params.slug });
    } else {
      game = memoryGames.find((item) => item.slug === request.params.slug);
      if (game) game.launches += 1;
    }
    if (!game) {
      response.status(404).json({ error: "Game not found." });
      return;
    }
    response.json({ ok: true, title: game.title, launches: game.launches, database: databaseStatus });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "The request could not be completed." });
});

function shutdown() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (mongoProcess && mongoProcess.exitCode === null) mongoProcess.kill();
  if (mongoClient) mongoClient.close().catch(() => {});
  if (httpServer) httpServer.close(() => process.exit(0));
  else process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

async function start() {
  memoryDemoUser = {
    email: demoEmail,
    name: "Player one",
    ...(await makePasswordRecord(demoPassword))
  };
  await startLocalMongo();
  httpServer = app.listen(port, "127.0.0.1", () => {
    console.log("Playroom is ready at http://127.0.0.1:" + port);
    console.log("Sign in with " + demoEmail + " / " + demoPassword);
  });
  connectMongo();
}

start().catch((error) => {
  console.error("Could not start Playroom:", error.message);
  process.exitCode = 1;
});
