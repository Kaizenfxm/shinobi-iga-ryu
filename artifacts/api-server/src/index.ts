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
    `[R2] R2_ACCOUNT_ID=${!!process.env.R2_ACCOUNT_ID} R2_ACCESS_KEY_ID=${!!process.env.R2_ACCESS_KEY_ID} R2_SECRET_ACCESS_KEY=${!!process.env.R2_SECRET_ACCESS_KEY} R2_BUCKET_NAME=${process.env.R2_BUCKET_NAME || "(default)"}`
  );
});
