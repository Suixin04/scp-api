const express = require("express");
const fs = require("fs");
const app = express();
const port = 3000;

app.use(express.json());

let scps = {};

fs.readFile("database.json", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    res.status(500).json({ error: "failed to read data" });
  } else {
    scps = JSON.parse(data);
  }
});

// Route to retrieve all users
app.get("/scp/:id", (req, res) => {
  const scpId = req.params.id;

  const scp = scps[scpId];

  if (scp) {
    res.json(scp);
  } else {
    res.status(404).json({ error: "SCP not found" });
  }

  es.json(users);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
