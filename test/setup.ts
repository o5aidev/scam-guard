// .env を読み込み、ANTHROPIC_API_KEY をテストから使えるようにする。
import { config } from "dotenv";

config(); // .env
config({ path: ".env.local", override: false }); // あれば .env.local も
