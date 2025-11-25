import type { Request, Response } from "express";

import { insertProjectSchema } from "@shared/schema";
import { storage } from "../storage";

export async function createProjectHandler(req: Request, res: Response) {
  const validation = insertProjectSchema.safeParse(req.body);

  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    const message =
      validation.error.errors[0]?.message ?? "Invalid project data";

    return res.status(400).json({
      error: message,
      details: fieldErrors,
    });
  }

  try {
    const project = await storage.createProject(validation.data);
    return res.status(201).json(project);
  } catch (error) {
    console.error("Failed to create project:", error);
    return res.status(500).json({ error: "Failed to create project" });
  }
}
