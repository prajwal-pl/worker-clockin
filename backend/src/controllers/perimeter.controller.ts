import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import {
  haversineDistanceInMeters,
  parseCoordinate,
  parseMeters,
} from "../lib/geo";

const prisma = new PrismaClient();

export const createPerimeter = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId!;
    const { name, location, latitude, longitude, radiusMeters, radiusKm } =
      req.body;

    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);
    const radius = parseMeters(radiusMeters, radiusKm);

    if (
      !name ||
      !location ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      radius === null
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "Latitude/Longitude out of range" });
    }

    const perimeter = await prisma.perimeter.create({
      data: {
        name,
        location,
        latitude: lat,
        longitude: lon,
        radius,
        managerId,
      },
    });

    return res.status(201).json({ perimeter });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listPerimeters = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId!;
    const perimeters = await prisma.perimeter.findMany({
      where: { managerId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ perimeters });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerimeter = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId!;
    const { id } = req.params;
    const perimeter = await prisma.perimeter.findFirst({
      where: { id, managerId },
    });
    if (!perimeter) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ perimeter });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePerimeter = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId!;
    const { id } = req.params;
    const existing = await prisma.perimeter.findFirst({
      where: { id, managerId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { name, location, latitude, longitude, radiusMeters, radiusKm } =
      req.body;
    const lat = latitude === undefined ? undefined : parseCoordinate(latitude);
    const lon =
      longitude === undefined ? undefined : parseCoordinate(longitude);
    const radius = parseMeters(radiusMeters, radiusKm) ?? undefined;

    if (
      (lat !== undefined && !Number.isFinite(lat)) ||
      (lon !== undefined && !Number.isFinite(lon))
    ) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }
    if (
      (lat !== undefined && (lat < -90 || lat > 90)) ||
      (lon !== undefined && (lon < -180 || lon > 180))
    ) {
      return res.status(400).json({ error: "Latitude/Longitude out of range" });
    }

    const perimeter = await prisma.perimeter.update({
      where: { id },
      data: {
        name,
        location,
        ...(lat !== undefined ? { latitude: lat } : {}),
        ...(lon !== undefined ? { longitude: lon } : {}),
        ...(typeof radius === "number" ? { radius } : {}),
      },
    });

    return res.status(200).json({ perimeter });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePerimeter = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId!;
    const { id } = req.params;
    const existing = await prisma.perimeter.findFirst({
      where: { id, managerId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await prisma.perimeter.delete({ where: { id } });
    return res.status(200).json({ message: "Deleted" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const checkWithinPerimeter = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    const lat = parseCoordinate(latitude as any);
    const lon = parseCoordinate(longitude as any);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const perimeters = await prisma.perimeter.findMany();
    let nearest:
      | ((typeof perimeters)[number] & { distance: number })
      | undefined;

    for (const p of perimeters) {
      const d = haversineDistanceInMeters(lat, lon, p.latitude, p.longitude);
      if (!nearest || d < nearest.distance) nearest = { ...p, distance: d };
    }

    const inside = !!nearest && nearest.distance <= (nearest.radius as number);

    return res.status(200).json({
      inside,
      nearest: nearest
        ? {
            id: nearest.id,
            name: nearest.name,
            distanceMeters: Math.round(nearest.distance),
            radiusMeters: nearest.radius,
          }
        : null,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
