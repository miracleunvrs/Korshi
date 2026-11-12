import config from "./playwright.config";
process.env.PLAYWRIGHT_TEST_BASE_URL = "http://127.0.0.1:3201";
export default { ...config, use: { ...config.use, baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL }, webServer: { ...config.webServer, command: "pnpm exec next start --port 3201", url: process.env.PLAYWRIGHT_TEST_BASE_URL } };
