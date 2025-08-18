const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connexion MongoDB locale
mongoose.connect("mongodb://127.0.0.1:27017/geo_agri")
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch((err) => console.error("❌ Erreur MongoDB:", err));

// ✅ Schéma Mongoose mis à jour
const WaterPoint = mongoose.model("WaterPoint", new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  owner: String,
  surfaceArea: String,       // Surface de terrain
  // Analyse d'eau
  flowRate: String,          // Débit
  waterSalinity: String,     // Salinité eau
  // Analyse de sol
  activeLimestone: String,   // Calcaire actif
  organicMatter: String,     // Matière organique  
  soilSalinity: String,      // Salinité sol
  soilPh: String            // pH sol
}));

// ✅ Récupérer tous les points
app.get("/api/points", async (req, res) => {
  const points = await WaterPoint.find();
  res.json(points);
});

// ✅ Ajouter un point
app.post("/api/points", async (req, res) => {
  const newPoint = new WaterPoint(req.body);
  await newPoint.save();
  res.status(201).json(newPoint);
});

// ✅ Modifier un point
app.put("/api/points/:id", async (req, res) => {
  try {
    const updated = await WaterPoint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la modification du point." });
  }
});

// ✅ Supprimer un point
app.delete("/api/points/:id", async (req, res) => {
  try {
    await WaterPoint.findByIdAndDelete(req.params.id);
    res.sendStatus(204); // No Content
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression du point." });
  }
});

// ✅ Lancer le serveur
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
