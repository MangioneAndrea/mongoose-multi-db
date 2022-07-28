import * as express from "express"
import * as request from 'supertest';
import {strict as assert} from "assert";
import type {Server} from "http"
import mongoose from "mongoose";
import {MongoMemoryServer} from 'mongodb-memory-server';

import type Simple from "./models/SimpleModel";
import {ExportingType} from "./models/ExportingTypeModel"
import mongooseMiddleware, {Tenant, killMiddlewareConnections} from "../src"


let server: Server;
let mongod: MongoMemoryServer

type KnownModels = {
    Simple: typeof Simple,
    ExportingType: ExportingType
}

declare global {
    namespace Express {
        interface Request {
            tenant: Tenant<KnownModels>
        }
    }
}
const exampleServer = () => new Promise<express.Express>(async (resolve) => {
    mongod = await MongoMemoryServer.create();

    const uri = mongod.getUri();
    const app = express()

    app.use(mongooseMiddleware({
        mongoUri: uri,
        modelsPaths: "C:\\Users\\andre\\Documents\\github.com\\MangioneAndrea\\mongoose-express-multi-db\\test\\models"
    }))


    server = app.listen("43826", () => resolve(app));
    server.addListener("close", () => killMiddlewareConnections(app).catch(console.error))
})
const getInsideRequest = (app: express.Express) => new Promise<[req: express.Request, res: express.Response]>(async (resolve) => {
    app.get("/example", (req, res) => {
        resolve([req, res])
    })
    await request(app).get("/example")
})

let app: express.Express
let req: express.Request
let res: express.Response


before(async () => {
    app = await exampleServer();
    [req, res] = await getInsideRequest(app);
})


it("has the tenant in the request", () => {
    assert("tenant" in req)
})
it("resolves the name as localhost", () => {
    assert.equal(req.tenant.name, "localhost")
})
it("has the simple model", () => {
    assert(req.tenant.models.has("Simple"))
})
it("has the js model", () => {
    assert(req.tenant.models.has("Js"))
})
it("has the nested model", () => {
    assert(req.tenant.models.has("Nested"))
})


it("has compiled the simple model, so findOne is defined", () => {
    assert(req.tenant.getModel("Simple").findOne)
})

it("compiles with the element type if the given type is a model", async () => {
    const el = await req.tenant.getModel("Simple").findOne().lean()
    el?._id
})

it("compiles with the element type if the given type is a model", async () => {
    const el = await req.tenant.getModel("ExportingType").findOne().lean()
    el?._id
})


after(() => {
    res.end()
    mongoose.disconnect()
    Object.keys(mongoose.models).forEach((m) => {
        delete mongoose.models[m]
    })
    server.close(console.error);
    mongod.stop({doCleanup: true, force: true}).finally(console.error)
})