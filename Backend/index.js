import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import chalk from "chalk";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(json());


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

    // const userSchema = joi.object({
    //     name: joi.string().required
    // })


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

        // Posso conectar com o banco de dados depois de digitar o nome do usuário
        // await mongoClient.connect();
        // database = mongoClient.db("test");
        // console.log(chalk.bold.green("Banco de dados conectado, show!!"))

        // trocar as coleções depois para participantes e mensagens

        await database.collection("participantesTeste").insertOne(login);
        console.log(chalk.bold.green("Login salvo no banco"));

        await database.collection("mensagensTeste").insertOne(usuario);
        console.log(chalk.bold.green("Usuario salvo no banco"));

        mostrarMensagens();
        mostrarParticipantes();
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Não rolou a inserção no db"))
        return;
    }
    res.sendStatus(201);
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user: nome } = req.headers;
    const mensagem = {
        from: nome,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('hh:mm:ss')
    }
    try {
        await database.collection("mensagensTeste").insertOne(mensagem);
        console.log(chalk.bold.green("Mensagem salva no banco"));
        res.sendStatus(201);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha no envio das mensagens"))
    }
})

function mostrarMensagens() {
    app.get("/messages", async (req, res) => {
        const { user: nome } = req.headers;
        const { limit } = req.query;
        let mensagens = 0;
        try {
            const participantes = await database.collection("mensagensTeste").find().toArray();
            console.log(chalk.bold.green("Mensagens obtidas do servidor"));
            if (limit !== "")  mensagens = participantes.reverse().slice(0,limit);
            else  mensagens = participantes;
            res.send(mensagens.reverse());
            return;
        }
        catch (error) {
            console.error(error);
            res.status(500).send(chalk.red.bold("Falha na obtenção das mensagens"))
        }
    })
}

function mostrarParticipantes() {
    app.get("/participants", async (req, res) => {
        const { user: nome } = req.headers;
        console.log("Nome do header do participante: ", chalk.red.bold(nome));
        try {
            const participantes = await database.collection("participantesTeste").find().toArray();
            console.log(chalk.bold.green("Participantes obtidos do servidor"));
            res.send(participantes);
        }
        catch (error) {
            console.error(error);
            res.status(500).send(chalk.red.bold("Falha na obtenção dos participantes"))
        }
    })
}

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await database.collection("mensagens").deleteOne({ _id: new ObjectId(id) })
        res.sendStatus(200);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha na remoção do participante"))
    }
})

app.post("/status", async (req,res) => {
    const { user: nome } = req.headers;
    const validação = await database.collection("participantesTeste").findOne({name: nome})
    if (validação) {
        console.log(chalk.bold.green("Deu bom"));
        await database.collection("participantesTeste").
        updateOne({name: nome}, {$set:{lastStatus:Date.now()}});
        res.sendStatus(200);
        return;
    }
    else {  
        console.log(chalk.bold.red("Deu ruim"));
        res.sendStatus(404);
        return;
    }
})

app.delete("/participants/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await database.collection("espera").deleteOne({ _id: new ObjectId(id) })
        res.sendStatus(200);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha na remoção do participante"))
    }
})

app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})


// Gerar horário atual
// const data = dayjs().format('hh:mm:ss') 
// console.log(data);

// const agora = Date.now();
// console.log(agora);
