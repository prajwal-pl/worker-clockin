import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { haversineDistanceInMeters, parseCoordinate } from "../lib/geo";

const prisma = new PrismaClient();

export const clockIn = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { latitude, longitude, note } = req.body;
    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const active = await prisma.clockIn.findFirst({
      where: { userId, clockOutAt: null },
    });
    if (active) {
      return res.status(400).json({ error: "Already clocked in" });
    }

    const perimeters = await prisma.perimeter.findMany();
    if (perimeters.length === 0) {
      return res.status(400).json({ error: "No perimeter configured" });
    }

    // Find nearest perimeter
    let nearest = perimeters[0];
    let minDist = haversineDistanceInMeters(
      lat,
      lon,
      nearest.latitude,
      nearest.longitude
    );
    for (let i = 1; i < perimeters.length; i++) {
      const p = perimeters[i];
      const d = haversineDistanceInMeters(lat, lon, p.latitude, p.longitude);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }

    if (minDist > nearest.radius) {
      return res
        .status(403)
        .json({
          error: "Outside perimeter",
          distanceMeters: Math.round(minDist),
        });
    }

    const now = new Date();
    const record = await prisma.clockIn.create({
      data: {
        userId,
        clockInAt: now,
        clockInLat: lat,
        clockInLong: lon,
        clockInNote: note ?? null,
      },
    });

    return res.status(201).json({ message: "Clocked in", record });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const clockOut = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { latitude, longitude, note } = req.body;
    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const active = await prisma.clockIn.findFirst({
      where: { userId, clockOutAt: null },
      orderBy: { clockInAt: "desc" },
    });

    if (!active) {
      return res.status(400).json({ error: "Not clocked in" });
    }

    const now = new Date();
    const updated = await prisma.clockIn.update({
      where: { id: active.id },
      data: {
        clockOutAt: now,
        clockOutLat: lat,
        clockOutLong: lon,
        clockOutNote: note ?? null,
      },
    });

    return res.status(200).json({ message: "Clocked out", record: updated });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getActiveStaff = async (_req: Request, res: Response) => {
  try {
    const active = await prisma.clockIn.findMany({
      where: { clockOutAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { clockInAt: "desc" },
    });
    return res.status(200).json({ active });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const requesterId = req.userId!;
    const { userId } = req.params;

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
    });
    if (!requester) return res.status(401).json({ error: "Unauthorized" });
    if (requester.id !== userId && requester.role === "CARE_WORKER") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const records = await prisma.clockIn.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              OR: [
                {
                  clockInAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                },
                {
                  clockOutAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { clockInAt: "desc" },
    });

    return res.status(200).json({ records });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days || 7);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const rows = await prisma.clockIn.findMany({
      where: {
        OR: [
          { clockInAt: { gte: from, lte: to } },
          { clockOutAt: { gte: from, lte: to } },
        ],
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const perDay: Record<string, { durations: number[]; users: Set<string> }> =
      {};
    const perUserTotal: Record<string, number> = {};

    for (const r of rows) {
      const start = new Date(
        Math.max(new Date(r.clockInAt).getTime(), from.getTime())
      );
      const end = new Date(
        Math.min(
          (r.clockOutAt ? new Date(r.clockOutAt) : new Date()).getTime(),
          to.getTime()
        )
      );

      if (end <= start) continue;

      const dur = end.getTime() - start.getTime();
      perUserTotal[r.userId] = (perUserTotal[r.userId] || 0) + dur;

      const key = dayKey(start);
      if (!perDay[key])
        perDay[key] = { durations: [], users: new Set<string>() };
      perDay[key].durations.push(dur);
      perDay[key].users.add(r.userId);
    }

    const avgHoursPerDay = Object.entries(perDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { durations, users }]) => ({
        date,
        avgHours: durations.length
          ? Number(
              (
                durations.reduce((a, b) => a + b, 0) /
                durations.length /
                3600000
              ).toFixed(2)
            )
          : 0,
        peopleCount: users.size,
      }));

    const totalHoursPerStaffLastWeek = Object.entries(perUserTotal).map(
      ([userId, ms]) => ({ userId, hours: Number((ms / 3600000).toFixed(2)) })
    );

    return res.status(200).json({
      range: { from, to },
      avgHoursPerDay,
      totalHoursPerStaffLastWeek,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
