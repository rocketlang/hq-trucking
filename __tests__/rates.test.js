const request = require("supertest");
const express = require("express");
const route = require("../src/bff/routes/rates");

test("GET /api/rates", async ()=>{
  const app = express();
  app.use("/api/rates", route);
  const res = await request(app).get("/api/rates");
  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty("status","ok");
});
