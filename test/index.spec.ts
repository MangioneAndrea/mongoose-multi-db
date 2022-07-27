import * as express from "express"
import * as request from 'supertest';
import {strict as assert} from "assert";
import {Server} from "http"
import mongoose from "mongoose";
import {MongoMemoryServer} from 'mongodb-memory-server';


import mongooseMiddleware, {Tenant} from "../src"


let server: Server;

const exampleServer = () => new Promise<express.Express>(async (resolve) => {
    const mongod = await MongoMemoryServer.create();

    const uri = mongod.getUri();
    const app = express()
    app.use(mongooseMiddleware({
        // @ts-ignore
        mongoUri: uri,
        modelsPaths: "C:\\Users\\andre\\Documents\\github.com\\MangioneAndrea\\mongoose-multi-db\\test\\models"
    }))


    server = app.listen("43826", () => resolve(app));
})

const getInsideRequest = (app: express.Express) => new Promise<[req: express.Request, res: express.Response]>(async (resolve) => {
    app.get("/example", (req, res) => {
        resolve([req, res])
    })
    await request(app).get("/example")
})

let app: express.Express
let req: express.Request & { tenant: Tenant }
let res: express.Response

before(async () => {
    app = await exampleServer();
    // @ts-ignore
    [req, res] = await getInsideRequest(app);
})


it("has the tenant in the request", async () => {
    assert("tenant" in req)
})
it("resolves the name as localhost", async () => {
    assert.equal(req.tenant.name, "localhost")
})
it("has the simple model", async () => {
    assert(req.tenant.models.has("Simple"))
})
it("has the js model", async () => {
    assert(req.tenant.models.has("Js"))
})
it("has the nested model", async () => {
    assert(req.tenant.models.has("Nested"))
})


after(() => {
    Object.keys(mongoose.models).forEach((m) => {
        delete mongoose.models[m]
    })
    server?.close();
})