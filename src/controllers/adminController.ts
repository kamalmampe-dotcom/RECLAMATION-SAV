/**
 * Contrôleur d'administration — journaux (audit + emails). Réservé ADMIN.
 */
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';

function take(req: Request): number {
  return Math.min(Number(req.query.take) || 100, 200);
}

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: take(req),
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      ip: true,
      details: true,
      createdAt: true,
      user: { select: { fullName: true, email: true } },
      complaint: { select: { reference: true } },
    },
  });
  res.json({ logs });
});

export const getEmailLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: take(req),
    select: {
      id: true,
      template: true,
      toAddress: true,
      subject: true,
      status: true,
      error: true,
      providerMessageId: true,
      createdAt: true,
      complaint: { select: { reference: true } },
    },
  });
  res.json({ logs });
});
