export function startWorker(): string {
  return "worker-ready";
}

if (process.env.NODE_ENV !== "test") {
  console.log(startWorker());
}
