import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(
    `[R2] CF_ACCOUNT_ID=${!!process.env.CF_ACCOUNT_ID} CF_ACCESS_KEY_ID=${!!process.env.CF_ACCESS_KEY_ID} CF_SECRET_ACCESS_KEY=${!!process.env.CF_SECRET_ACCESS_KEY} CF_BUCKET_NAME=${process.env.CF_BUCKET_NAME || "(default)"}`
  );
});
