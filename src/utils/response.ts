export const sendJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};
