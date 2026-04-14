import express from "express";
const router = express.Router();

import { getAllGroups, getGroupStandings } from "../src/services/groups";


// GET /api/groups
router.get("/", async (req, res) => {
  const groups = await getAllGroups();
  res.json(groups);
});

// GET /api/groups/:name/standings
router.get("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const standings = await getGroupStandings(groupId);
  res.json(standings);
});


export default router;