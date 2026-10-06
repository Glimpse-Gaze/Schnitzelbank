import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1400 });
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector(".board-frame image");
const data = await page.evaluate(() => {
  const images = [...document.querySelectorAll(".board-frame image")].map((el) => ({
    href: (el.getAttribute("href") || "").split("/").pop(),
    x: Number(el.getAttribute("x")),
    y: Number(el.getAttribute("y")),
    w: Number(el.getAttribute("width")),
    h: Number(el.getAttribute("height")),
  }));
  const hits = [...document.querySelectorAll(".board-frame rect title")].map((node) => {
    const rect = node.parentElement;
    return {
      id: node.textContent,
      x: Number(rect.getAttribute("x")),
      y: Number(rect.getAttribute("y")),
      w: Number(rect.getAttribute("width")),
      h: Number(rect.getAttribute("height")),
    };
  });
  return { images, hits };
});
console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: "C:/Users/Robert/AppData/Local/Temp/schnitzel-assembly.png" });
await browser.close();
