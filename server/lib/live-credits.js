import { prisma } from "./prisma.js";

export async function getLiveCreditBalance(clientId) {
  if (!clientId) return 0;
  const result = await prisma.liveCreditLedger.aggregate({
    where: { clientId },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

export async function getLiveCreditSummary(clientId) {
  const balance = await getLiveCreditBalance(clientId);
  const recent = clientId
    ? await prisma.liveCreditLedger.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  return { balance, recent };
}
