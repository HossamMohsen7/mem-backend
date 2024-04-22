import { db } from "./db.js";
import argon2 from "argon2";

const main = async () => {
  const pass = await argon2.hash("admin");
  const admin = await db.user.create({
    data: {
      email: "admin@admin.com",
      password: pass,
      type: "ADMIN",
      firstName: "Mem",
      lastName: "Admin",
      username: "admin",
    },
  });
  console.log(admin);
};
main();
