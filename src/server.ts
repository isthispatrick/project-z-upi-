import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = await createApp();

app.listen(port, () => {
  console.log(`Social Finance Copilot API listening on http://localhost:${port}`);
});
