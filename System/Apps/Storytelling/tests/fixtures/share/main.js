// import fake from "./not-a-real-import.js" -- comments are not imports
import { APP_VERSION } from "./data/version.js";
import { greet } from "./shared/greet.js";

console.log(greet("story") + " | v" + APP_VERSION);
