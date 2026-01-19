import request from "supertest";

process.env.BUSINESS_HOURS_START = "0";
process.env.BUSINESS_HOURS_END = "24";

const prismaMock = {
  layout: {
    findFirst: jest.fn(),
  },
  reservationTable: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  reservation: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const redlockMock = {
  acquire: jest.fn(),
};

jest.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
jest.mock("../src/config/redis", () => ({ redlock: redlockMock }));
jest.mock("../src/config/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
    },
  },
}));

const app = require("../src/app").default;

describe("POST /reservations", () => {
  beforeEach(() => {
    prismaMock.layout.findFirst.mockReset();
    prismaMock.reservationTable.findFirst.mockReset();
    prismaMock.reservationTable.findMany.mockReset();
    prismaMock.reservationTable.createMany.mockReset();
    prismaMock.reservation.create.mockReset();
    prismaMock.$transaction.mockReset();
    redlockMock.acquire.mockReset();
  });

  test("creates a reservation and returns table assignment", async () => {
    const startTime = buildAlignedStartTime();
    prismaMock.layout.findFirst.mockResolvedValue({
      id: "layout-1",
      isActive: true,
      tables: [{ id: "T1" }, { id: "T2" }],
    });
    prismaMock.reservationTable.findMany.mockResolvedValue([]);
    prismaMock.reservationTable.findFirst.mockResolvedValue(null);
    redlockMock.acquire.mockResolvedValue({ release: jest.fn() });
    prismaMock.reservation.create.mockResolvedValue({
      id: "res-1",
      status: "CONFIRMED",
    });
    prismaMock.reservationTable.createMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
    redlockMock.acquire.mockResolvedValue({ release: jest.fn() });

    const response = await request(app)
      .post("/reservations")
      .send({
        clientName: "Alex Doe",
        clientPhone: "+14155551212",
        partySize: 2,
        startTime: startTime.toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.tableIds).toEqual(["T1"]);
  });

  test("returns 409 when no tables available", async () => {
    const startTime = buildAlignedStartTime();
    prismaMock.layout.findFirst.mockResolvedValue({
      id: "layout-1",
      isActive: true,
      tables: [{ id: "T1" }],
    });
    prismaMock.reservationTable.findMany.mockResolvedValue([{ tableId: "T1" }]);

    const response = await request(app)
      .post("/reservations")
      .send({
        clientName: "Alex Doe",
        clientPhone: "+14155551212",
        partySize: 2,
        startTime: startTime.toISOString(),
      });

    expect(response.status).toBe(409);
  });
});

function buildAlignedStartTime(): Date {
  const now = new Date();
  const minutes = now.getUTCMinutes();
  const rounded = minutes + (15 - (minutes % 15 || 15));
  const aligned = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    rounded,
    0,
    0
  ));
  aligned.setUTCHours(aligned.getUTCHours() + 1);
  return aligned;
}
