import express from "express";
import chalk from "chalk";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req,res) => {
    res.send("OK");
})

app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})