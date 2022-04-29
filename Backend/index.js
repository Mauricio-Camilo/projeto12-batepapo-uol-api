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

app.post("/participants", async (req, res) => {
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
    
    const usuario = {
        from: name,  
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time: dayjs().format('hh:mm:ss')
    } 

    try {
        await database.collection("usuarios").insertOne(login);
        console.log(chalk.bold.green("Login salvo no banco"));
        res.sendStatus(201);

        await database.collection("espera").insertOne(usuario);
        console.log(chalk.bold.green("Usuario salvo no banco"));
        res.sendStatus(201);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Não rolou a inserção no db"))
      }
});





app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})


// Gerar horário atual
// const data = dayjs().format('hh:mm:ss') 
// console.log(data);

// const agora = Date.now();
// console.log(agora);
