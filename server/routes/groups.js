import express from "express";
import { getAllGroups, getGroupStandings } from "../src/services/groups.js";

const router = express.Router();

// GET /api/groups
router.get("/", async (req, res, next) => {
  try {
    const groups = await getAllGroups();
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// GET /api/groups/:groupId
router.get("/:groupId", async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const standings = await getGroupStandings(groupId);
    if (standings.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(standings);
  } catch (error) {
    next(error);
  }
});

export default router;
