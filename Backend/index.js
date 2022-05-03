import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import chalk from "chalk";
import cors from "cors";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";

dotenv.config();

console.log(process.env.MONGO_URL)  // TIRAR

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

// TIRAR

// const promise = mongoClient.connect();
// promise.then(() => {
//     database = mongoClient.db("test");
//     console.log(chalk.bold.green("Banco de dados conectado, show!!"))
// })
// promise.catch(e => console.log(chalk.bold.red("Deu ruim"), e));

app.post("/participants", async (req, res) => {
    let { name } = req.body;
    console.log(chalk.red.bold(name));
    const validação = userSchema.validate(name);
    if (validação.error) {
        res.status(422).send("Todos os campos são obrigatórios");
        return;
    }
    // SIMPLIFICAR
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
        await mongoClient.connect();
        database = mongoClient.db("test");
        console.log(chalk.bold.green("Banco de dados conectado, show!!"))
        const verificaNome = await database.collection("participantesTeste").findOne({ name: name }) // RESUMIR
        console.log("teste: ", verificaNome);

        // VERIFICAR QUANDO POSSÍVEL
        if (verificaNome) {
            res.status(409).send("Nome já existente");
            mongoClient.close();
            return;
        }

        // trocar as coleções depois para participantes e mensagens

        await database.collection("participantesTeste").insertOne(login);
        console.log(chalk.bold.green("Login salvo no banco"));

        await database.collection("mensagensTeste").insertOne(usuario);
        console.log(chalk.bold.green("Usuario salvo no banco"));

        mostrarMensagens();
        mostrarParticipantes();
        setInterval(() => procurarUsuarioInativo(), 5000); // TROCAR PARA 15000
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
            const participantes = await database.collection("mensagensTeste").find().toArray();
            const mensagensFiltradas = participantes.filter(participante => {
                const usuario = participante.from === nome || participante.to === nome;
                const mensagemPrivada = usuario && participante.type === 'private_message';
                const mensagemPublica = participante.type === 'status' || participante.type === 'message';
                return mensagemPrivada || mensagemPublica;
            })
            console.log(chalk.bold.green("Mensagens obtidas do servidor"));
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

async function procurarUsuarioInativo() {
    try {
        const participantes = await database.collection("participantesTeste").find().toArray();
        console.log(chalk.bold.red(participantes));
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
    console.log("entrou na função")
    // try {
    //     // Testar depois sem esse await
    //     await participantesInativos.forEach(participante => {
    //         const mensagem = {
    //             from: participante.name,
    //             to: "Todos",
    //             text: "sai da sala...",
    //             type: "status",
    //             time: dayjs().format('hh:mm:ss')
    //         }
    //         database.collection("participantesTeste").deleteOne({ _id: new ObjectId(participante._id) })
    //         database.collection("mensagensTeste").insertOne(mensagem);
    //     })
    // }
    // catch (error) {
    //     console.error(error);
    //     res.status(500).send(chalk.red.bold("Falha na obtenção dos participantes"))
    // }
}

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user: nome } = req.headers;
    // SIMPLIFICAR O CÓDIGO
    const mensagem = {
        from: nome,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('hh:mm:ss')
    }

    const validação = messageSchema.validate(mensagem);
    console.log(validação);
    if (validação.error) {
        res.status(422).send("Deu ruim pra enviar a mensagem");
        return;
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

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { user: nome } = req.headers;
    try {
        const procuraMensagem = await database.collection("mensagensTeste").findOne({ _id: new ObjectId(id) })
        if (!procuraMensagem) {
            res.status(404).send("Mensagem não encontrada");
            return;
        }
        else {
            await database.collection("mensagensTeste").deleteOne({ _id: new ObjectId(id) })
            res.sendStatus(200);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send(chalk.red.bold("Falha para deletar mensagem"))
    }
})

app.post("/status", async (req, res) => {
    const { user: nome } = req.headers;
    const validação = await database.collection("participantesTeste").findOne({ name: nome })
    if (validação) {
        console.log(chalk.bold.green("Atualização do status feito com sucesso"));
        await database.collection("participantesTeste").
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

app.listen(5000, () => {
    console.log(chalk.bold.blue("Servidor vivo na porta 5000"));
})

