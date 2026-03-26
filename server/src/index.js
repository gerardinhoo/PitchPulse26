import express from "express";
import cors from "cors";
import dotenv from "dotenv";


dotenv.config()

const app = express();

app.use(cors());
app.use(express.json())


app.get("/api/health", (req, res) => {
    res.json({ status: "API is running!"});
})


const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})