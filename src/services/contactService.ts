const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type ContactRow = {
  id: number;
  email?: string | null;
  phoneNumber?: string | null;
  linkedId?: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: Date;
};

const findMatches = async (email: string | null, phone: string | null) => {
  return prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phoneNumber: phone } : undefined,
      ].filter(Boolean),
    },
    orderBy: { createdAt: "asc" },
  });
};

const expandCluster = async (initial: ContactRow[]) => {
  const queue = [...initial];
  const seen = new Set<number>(queue.map((c) => c.id));
  while (queue.length) {
    const c = queue.shift()!;
    const related = await prisma.contact.findMany({
      where: {
        OR: [
          c.email ? { email: c.email } : undefined,
          c.phoneNumber ? { phoneNumber: c.phoneNumber } : undefined,
          c.linkedId ? { id: c.linkedId } : undefined,
        ].filter(Boolean),
      },
    });
    for (const r of related) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        queue.push(r);
      }
    }
  }
  return prisma.contact.findMany({
    where: { id: { in: Array.from(seen) } },
    orderBy: { createdAt: "asc" },
  });
};

const createPrimary = async (email: string | null, phone: string | null) => {
  return prisma.contact.create({
    data: { email, phoneNumber: phone, linkPrecedence: "primary" },
  });
};

const createSecondary = async (
  primaryId: number,
  email?: string | null,
  phone?: string | null
) => {
  return prisma.contact.create({
    data: {
      email: email || undefined,
      phoneNumber: phone || undefined,
      linkedId: primaryId,
      linkPrecedence: "secondary",
    },
  });
};

const demoteOtherPrimaries = async (
  primaryId: number,
  contacts: ContactRow[]
) => {
  const others = contacts.filter(
    (c) => c.id !== primaryId && c.linkPrecedence === "primary"
  );
  for (const op of others) {
    await prisma.contact.update({
      where: { id: op.id },
      data: { linkPrecedence: "secondary", linkedId: primaryId },
    });
  }
};

export {
  findMatches,
  expandCluster,
  createPrimary,
  createSecondary,
  demoteOtherPrimaries,
};
