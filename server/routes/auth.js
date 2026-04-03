import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";


const router = express.Router();

const JWT_SECRET = "supersecret";

// REGISTER
router.post("/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
    });

      res.json({ message: "User created", userId: user.id });
    } catch (error) {
        console.error("ERROR", error)

      if (error.code === "P2002") {
        return res.status(400).json({ error: "User already exists" });
      }

      res.status(500).json({ error: "Registration failed" });
}
})

// LOGIN
router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if(!user) {
        return res.status(401).json({ error: "Invalid Credentials"});
      }

      const valid = await bcrypt.compare(password, user.password);

      if(!valid) {
        return res.status(401).json({ error: "Invalid Credentials"});
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({token});
    } catch (error) {
      console.error("ERROR", error)
      res.status(500).json({ error: "Login Failed"})
    }
})

// Protected Route
router.get("/me", authMiddleware, async(req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true }
  })
  res.json(user);
})


export default router;
