const express = require("express");
const router = express.Router();
const {
  findMatches,
  expandCluster,
  createPrimary,
  createSecondary,
  demoteOtherPrimaries,
} = require("../services/contactService");
const { sendJson } = require("../utils/response");

type IdentifyReq = { email?: string | null; phoneNumber?: string | null };

router.post("/", async (req: any, res: any) => {
  const body = req.body as IdentifyReq;
  const email = body?.email ?? null;
  const phone = body?.phoneNumber ?? null;
  if (!email && !phone) {
    return sendJson(res, 400, { error: "email or phoneNumber required" });
  }

  const matches = await findMatches(email, phone);
  if (matches.length === 0) {
    const created = await createPrimary(email, phone);
    return sendJson(res, 200, {
      contact: {
        primaryContatctId: created.id,
        emails: created.email ? [created.email] : [],
        phoneNumbers: created.phoneNumber ? [created.phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  const cluster = await expandCluster(matches);
  const primary = cluster.reduce(
    (acc: any, c: any) => (!acc || c.createdAt < acc.createdAt ? c : acc),
    null
  );
  if (!primary) throw new Error("unexpected");

  const emailsSet = new Set<string>();
  const phonesSet = new Set<string>();
  for (const c of cluster) {
    if (c.email) emailsSet.add(c.email);
    if (c.phoneNumber) phonesSet.add(c.phoneNumber);
  }

  const needsNewEmail = email && !emailsSet.has(email);
  const needsNewPhone = phone && !phonesSet.has(phone);

  if (needsNewEmail || needsNewPhone) {
    await createSecondary(
      primary.id,
      email, 
      phone 
    );
  }
  await demoteOtherPrimaries(primary.id, cluster);

  const final = await expandCluster(cluster);
  const emails = Array.from(
    new Set([primary.email, ...final.map((c: any) => c.email)].filter(Boolean))
  );
  const phoneNumbers = Array.from(
    new Set(
      [primary.phoneNumber, ...final.map((c: any) => c.phoneNumber)].filter(
        Boolean
      )
    )
  );
  const secondaryContactIds = final
    .filter((c: any) => c.id !== primary.id)
    .map((c: any) => c.id);

  return sendJson(res, 200, {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  });
});

module.exports = router;
