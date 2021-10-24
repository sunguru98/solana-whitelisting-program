import path from "path";
import fs from "fs-extra";
import { Keypair } from "@solana/web3.js";

export const KEYS_FOLDER = path.resolve(__dirname, "../", "keys");

async function createDirectories(subDir?: string) {
  await fs.mkdirp(path.resolve(KEYS_FOLDER));
  await fs.mkdirp(path.resolve(KEYS_FOLDER, subDir || "persons"));
}

export const checkKeysDir = async () => fs.pathExists(KEYS_FOLDER);

export const storeKeypair = async (
  name: string,
  type: "persons" | "tokens",
  rewrite: boolean = false,
  keypair: Keypair = new Keypair()
): Promise<boolean> => {
  try {
    if (rewrite) {
      await createDirectories(type);
      await fs.mkdirp(path.resolve(KEYS_FOLDER, type, name));
      await fs.writeJSON(
        path.resolve(KEYS_FOLDER, type, name, "privateKey.json"),
        Object.values(keypair.secretKey)
      );
      await fs.writeJSON(
        path.resolve(KEYS_FOLDER, type, name, "publicKey.json"),
        keypair.publicKey.toString()
      );
    }
    return true;
  } catch (err) {
    console.error(err.message);
    return false;
  }
};

export const checkFileIfExists = async (
  name: string,
  type: "persons" | "tokens"
) => {
  try {
    return fs.pathExists(
      path.resolve(KEYS_FOLDER, type, name, "publicKey.json")
    );
  } catch (err) {
    return false;
  }
};
