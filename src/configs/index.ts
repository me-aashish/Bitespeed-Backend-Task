const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:sillicon@localhost:5432/bitespeed?schema=public";
export default { PORT, DATABASE_URL };
