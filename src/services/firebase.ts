import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const app = admin.initializeApp({
  storageBucket: "nmemapp.appspot.com",
  credential: admin.credential.cert(
    JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../nmemapp-firebase-adminsdk-28c22-76e35802fc.json"
        ),
        "utf-8"
      )
    )
  ),
});

export { app as firebaseApp };
