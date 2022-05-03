import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import chalk from "chalk";
import cors from "cors";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const userSchema = Joi.string().required();

const messageSchema = Joi.object({
    from: Joi.string(),
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.valid("message", "private_message"),
    time: Joi.any()
})

let database = null;
const mongoClient = new MongoClient(process.env.MONGO_URL);

app.post("/participants", async (req, res) => {
    let { name } = req.body;
    const validação = userSchema.validate(name);
    if (validação.error) {
        res.status(422).send("Todos os campos são obrigatórios");
        return;
    }
    const login = {
        name,
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
        await mongoClient.connect();
        database = mongoClient.db("test");
        console.log(chalk.bold.green("Banco de dados conectado, show!!"))
        const verificaNome = await database.collection("participantes").findOne({ name: name }) // RESUMIR

        if (verificaNome) {
            res.status(409).send("Nome já existente");
            mongoClient.close();
            return;
        }

        await database.collection("participantes").insertOne(login);
        console.log(chalk.bold.green("Login salvo no banco"));

        await database.collection("mensagens").insertOne(usuario);
        console.log(chalk.bold.green("Usuario salvo no banco"));

        mostrarMensagens();
        mostrarParticipantes();
        setInterval(() => procurarUsuarioInativo(), 15000);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Não deu certo a inserção no banco de dados"))
        return;
    }
    res.sendStatus(201);
});

function mostrarMensagens() {
    app.get("/messages", async (req, res) => {
        const { user: nome } = req.headers;
        const { limit } = req.query;
        let mensagens = 0;
        try {
            const participantes = await database.collection("mensagens").find().toArray();
            const mensagensFiltradas = participantes.filter(participante => {
                const usuario = participante.from === nome || participante.to === nome;
                const mensagemPrivada = usuario && participante.type === 'private_message';
                const mensagemPublica = participante.type === 'status' || participante.type === 'message';
                return mensagemPrivada || mensagemPublica;
            })
            if (limit !== "") mensagens = mensagensFiltradas.reverse().slice(0, limit);
            else mensagens = mensagensFiltradas;
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
        try {
            const participantes = await database.collection("participantes").find().toArray();
            res.send(participantes);
        }
        catch (error) {
            console.error(error);
            res.status(500).send(chalk.red.bold("Falha na obtenção dos participantes"))
        }
    })
}

async function procurarUsuarioInativo() {
    try {
        const participantes = await database.collection("participantes").find().toArray();
        if (participantes === "") {
            mongoClient.close();
            console.log(chalk.bold.blue("Servidor desconectado"));
            return;
        }
        const participantesInativos = participantes.filter(participante => {
            return ((Date.now() / 1000) - (participante.lastStatus / 1000) >= 10)
        })
        removerUsuarioInativo(participantesInativos);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha na obtenção dos participantes"))
    }
}

async function removerUsuarioInativo(participantesInativos) {
    try {
        await participantesInativos.forEach(participante => {
            const mensagem = {
                from: participante.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format('hh:mm:ss')
            }
            database.collection("participantes").deleteOne({ _id: new ObjectId(participante._id) })
            database.collection("mensagens").insertOne(mensagem);
        })
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha na obtenção dos participantes"))
    }
}

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user: nome } = req.headers;
    const mensagem = {
        from: nome,
        to,
        text,
        type,
        time: dayjs().format('hh:mm:ss')
    }

    const validação = messageSchema.validate(mensagem);
    if (validação.error) {
        res.sendStatus(422);
        return;
    }
    try {
        await database.collection("mensagens").insertOne(mensagem);
        console.log(chalk.bold.green("Mensagem salva no banco"));
        res.sendStatus(201);
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha no envio das mensagens"))
    }
})

app.post("/status", async (req, res) => {
    const { user: nome } = req.headers;
    const validação = await database.collection("participantes").findOne({ name: nome })
    if (validação) {
        console.log(chalk.bold.green("Atualização do status feito com sucesso"));
        await database.collection("participantes").
            updateOne({ name: nome }, { $set: { lastStatus: Date.now() } });
        res.sendStatus(200);
        return;
    }
    else {
        console.log(chalk.bold.red("Não deu pra atualizar o status"));
        res.sendStatus(404);
        return;
    }
})

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { user: nome } = req.headers;
    try {
        const procuraMensagem = await database.collection("mensagens").findOne({ _id: new ObjectId(id) })
        if (!procuraMensagem) {
            res.sendStatus(404);
            return;
        }
        else {
            await database.collection("mensagens").deleteOne({ _id: new ObjectId(id) })
            res.sendStatus(200);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha para deletar mensagem"))
    }
})

app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})

