import console = require("console");

const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

type IdentifyReq = { email?: string | null; phoneNumber?: string | null };

app.post("/identify", async (req, res) => {
  const body = req.body as IdentifyReq;
  const email = body.email ?? null;
  const phone = body.phoneNumber ?? null;

  if (!email && !phone) {
    return res.status(400).json({ error: "email or phoneNumber required" });
  }

  const matches = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phoneNumber: phone } : undefined,
      ].filter(Boolean) as any[],
    },
    orderBy: { createdAt: "asc" },
  });

  if (matches.length === 0) {
    const created = await prisma.contact.create({
      data: { email, phoneNumber: phone, linkPrecedence: "primary" },
    });

    return res.json({
      contact: {
        primaryContatctId: created.id,
        emails: created.email ? [created.email] : [],
        phoneNumbers: created.phoneNumber ? [created.phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  const queue = [...matches];
  const seenIds = new Set<number>(queue.map((c) => c.id));
  while (queue.length) {
    const c = queue.shift()!;
    const related = await prisma.contact.findMany({
      where: {
        OR: [
          c.email ? { email: c.email } : undefined,
          c.phoneNumber ? { phoneNumber: c.phoneNumber } : undefined,
          c.linkedId ? { id: c.linkedId } : undefined,
        ].filter(Boolean) as any[],
      },
    });
    for (const r of related) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        queue.push(r);
      }
    }
  }

  const allContacts = await prisma.contact.findMany({
    where: { id: { in: Array.from(seenIds) } },
    orderBy: { createdAt: "asc" },
  });
  const primary = allContacts.reduce(
    (acc, c) => (!acc || c.createdAt < acc.createdAt ? c : acc),
    null as null | (typeof allContacts)[0]
  );

  if (!primary) throw new Error("unexpected");

  const emailsSet = new Set<string>();
  const phonesSet = new Set<string>();
  for (const c of allContacts) {
    if (c.email) emailsSet.add(c.email);
    if (c.phoneNumber) phonesSet.add(c.phoneNumber);
  }

  let createdSecondary = null;
  const needsNewEmail = email && !emailsSet.has(email);
  const needsNewPhone = phone && !phonesSet.has(phone);

  if (needsNewEmail || needsNewPhone) {
    const created = await prisma.contact.create({
      data: {
        email: needsNewEmail ? email : null,
        phoneNumber: needsNewPhone ? phone : null,
        linkedId: primary.id,
        linkPrecedence: "secondary",
      },
    });
    createdSecondary = created;
    allContacts.push(created);
    if (created.email) emailsSet.add(created.email);
    if (created.phoneNumber) phonesSet.add(created.phoneNumber);
  }

  const otherPrimaries = allContacts.filter(
    (c) => c.id !== primary.id && c.linkPrecedence === "primary"
  );
  for (const op of otherPrimaries) {
    await prisma.contact.update({
      where: { id: op.id },
      data: { linkPrecedence: "secondary", linkedId: primary.id },
    });
    op.linkPrecedence = "secondary";
    op.linkedId = primary.id;
  }

  const finalContacts = await prisma.contact.findMany({
    where: { id: { in: Array.from(new Set(allContacts.map((c) => c.id))) } },
    orderBy: { createdAt: "asc" },
  });

  const emails = Array.from(
    new Set(
      [primary.email, ...finalContacts.map((c) => c.email)].filter(
        Boolean
      ) as string[]
    )
  );
  const phoneNumbers = Array.from(
    new Set(
      [primary.phoneNumber, ...finalContacts.map((c) => c.phoneNumber)].filter(
        Boolean
      ) as string[]
    )
  );

  const secondaryContactIds = finalContacts
    .filter((c) => c.id !== primary.id)
    .map((c) => c.id);

  return res.json({
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`listening ${port}`);
});
