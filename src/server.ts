const express = require("express");
const bodyParser = require("body-parser");
const identifyRouter =
  require("./routes/identify").default ?? require("./routes/identify");
const config = require("./configs").default ?? require("./configs");
const app = express();
app.use(bodyParser.json());
app.use("/identify", identifyRouter);
const port = config.PORT;
app.listen(port, () => {
  console.log(`listening ${port}`);
});
