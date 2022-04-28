import express, { json } from "express";
import { MongoClient } from "mongodb";
import chalk from "chalk";
import cors from "cors";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(json());

const participantes = [];

const mensagens = [];

let database = null;
const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
const promise = mongoClient.connect();
    promise.then(() => {
        database = mongoClient.db("test");
        console.log(chalk.bold.green("Banco de dados conectado, show!!"))
    })
    promise.catch(e => console.log(chalk.bold.red("Deu ruim"), e));

app.post("/participants", (req, res) => {
    let { name } = req.body;
    console.log(name);
    if (!name) {
        console.log(chalk.bold.red("Nome não enviado"));
        res.status(422).send("Todos os campos são obrigatórios");
        return;
    }
    const login = {
        name: name,
        lastStatus: Date.now()
    }
    res.sendStatus(201);
    // const promise2 = database.collection("usuarios").insertOne(login);
    // promise2.then(confirmação => {
    //     console.log("deu bom");
    //     res.sendStatus(201);
    // })
    // promise2.catch(e => {console.log(chalk.bold.red("Deu ruim para fazer login"), e);
    // res.status(500).send("Não rolou a inserção no db")})
});

app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})


// Gerar horário atual
// const data = dayjs().format('hh:mm:ss') 
// console.log(data);

// const agora = Date.now();
// console.log(agora);
