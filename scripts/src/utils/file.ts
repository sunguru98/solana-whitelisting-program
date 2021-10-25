import path from "path";
import fs from "fs-extra";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { WhiteListKeyType } from "../types";
import { SOLANA_CONNECTION } from "../constants";

export const KEYS_FOLDER = path.resolve(__dirname, "../", "keys");

async function createDirectories(subDir?: string) {
  await fs.mkdirp(path.resolve(KEYS_FOLDER));
  await fs.mkdirp(path.resolve(KEYS_FOLDER, subDir || "persons"));
}

export const checkKeysDir = async () => fs.pathExists(KEYS_FOLDER);

export const storeKeypair = async (
  name: string,
  type: WhiteListKeyType,
  requireFunding: boolean = true,
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

    if (requireFunding) {
      console.log(`FUNDING ${keypair.publicKey.toString()}`);
      SOLANA_CONNECTION.requestAirdrop(
        keypair.publicKey,
        LAMPORTS_PER_SOL * 100
      );
    }

    return true;
  } catch (err) {
    console.error(err.message);
    return false;
  }
};

export const getKeyPair = async (name: string, type: WhiteListKeyType) => {
  try {
    if (!(await checkIfKeyExists(name, type))) {
      throw new Error("File doesn't exist");
    }

    const secretKey = await fs.readJSON(
      path.resolve(KEYS_FOLDER, type, name, "privateKey.json")
    );

    const publicKey = await fs.readJSON(
      path.resolve(KEYS_FOLDER, type, name, "publicKey.json")
    );

    return new Keypair({
      secretKey: Uint8Array.of(...secretKey),
      publicKey: new PublicKey(publicKey).toBytes(),
    });
  } catch (err) {
    return null;
  }
};

export const checkIfKeyExists = async (
  name: string,
  type: WhiteListKeyType
) => {
  try {
    return fs.pathExists(path.resolve(KEYS_FOLDER, type, name));
  } catch (err) {
    return false;
  }
};
