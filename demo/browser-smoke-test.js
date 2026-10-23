const path = require("node:path");
const { pathToFileURL } = require("node:url");
const playwrightPath = path.join(
  process.env.USERPROFILE,
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules",
  "playwright",
);
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
  await page.getByRole("button", { name: "Run 50 samples" }).click();
  await page.getByText("50 of 50 labels agree").waitFor();

  const metrics = {
    processed: await page.locator("#processed").textContent(),
    accuracy: await page.locator("#accuracy").textContent(),
    urgentRecall: await page.locator("#urgent-recall").textContent(),
    reviewCount: await page.locator("#review-count").textContent(),
  };

  if (metrics.processed !== "50" || metrics.accuracy !== "100%" || metrics.urgentRecall !== "6/6") {
    throw new Error(`Unexpected browser metrics: ${JSON.stringify(metrics)}`);
  }

  await page.getByRole("button", { name: "Evidence & handoff" }).click();
  await page.locator("#run-evidence").getByText("50/50", { exact: true }).waitFor();
  await page.locator("#run-evidence").getByText("Development-set agreement", { exact: false }).waitFor();
  if (await page.locator("#export-evidence").isDisabled()) {
    throw new Error("Evidence export was not enabled after the 50-email run.");
  }
  await page.screenshot({ path: path.join(__dirname, "demo-evidence-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.getByRole("button", { name: "Try a new email" }).click();
  await page.getByRole("button", { name: "Classify email" }).click();
  await page.getByText("Unscored live trial").waitFor();
  await page.getByRole("button", { name: "Confirm route" }).click();
  await page.getByText("Priya confirmed the urgent route.").waitFor();
  await page.getByRole("button", { name: "Simulate Repairs acknowledgement" }).click();
  await page.getByText("Repairs acknowledged the urgent alert.").waitFor();

  await page.screenshot({ path: path.join(__dirname, "demo-preview.png"), fullPage: true });
  console.log(`Browser smoke test passed: ${JSON.stringify(metrics)}`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
