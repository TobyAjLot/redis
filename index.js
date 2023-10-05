import express from "express";
import { createClient } from "redis";
import util from "util";
import axios from "axios";

const client = createClient({ legacyMode: true });

await client.connect();

client.set = util.promisify(client.set);
client.get = util.promisify(client.get);

const app = express();
const port = 8080;
app.use(express.json());

const DEFAULT_EXPIRATION = 10;

const validateId = (req, res, next) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Parameter is not a number" });
  }
  next();
};

app.post("/", async (req, res) => {
  const { key, value } = req.body;

  const response = await client.set(key, value);
  res.json(response);
});

app.get("/", async (req, res) => {
  const { key } = req.query;
  const value = await client.get(key);
  res.json(value);
});

app.get("/posts/:id", validateId, async (req, res) => {
  const { id } = req.params;

  const cachedPost = await client.get(`post-${id}`);

  if (cachedPost) {
    return res.json(JSON.parse(cachedPost));
  }

  const { data } = await axios.get(
    `https://jsonplaceholder.typicode.com/posts/${id}`
  );

  client.set(`post-${id}`, "EX", 10, JSON.stringify(data));

  res.json(data);
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
