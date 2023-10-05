import axios from "axios";
import cors from "cors";
import express from "express";
import { createClient } from "redis";

const redisClient = createClient({ legacyMode: true });

await redisClient.connect();

const app = express();
const port = 8080;
app.use(express.json());
app.use(cors());

const validateId = (req, res, next) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Parameter is not a number" });
  }
  next();
};

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos",
      { params: { albumId } }
    );
    return data;
  });
  res.json(photos);
});

app.get("/photos/:id", async (req, res) => {
  const { id } = req.params.id;
  const photo = getOrSetCache(`photos:${id}`, async () => {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${id}`
    );
    return data;
  });
  res.json(photo);
});

const getOrSetCache = (key, cb) => {
  return new Promise((resolve, reject) => {
    redisClient.get(key, async (error, data) => {
      if (error) return reject(error);
      if (data) return resolve(JSON.parse(data));
      const freshData = await cb();
      redisClient.set(key, JSON.stringify(freshData));
      resolve(freshData);
    });
  });
};

app.listen(port, () => console.log(`Server listening on port ${port}`));
