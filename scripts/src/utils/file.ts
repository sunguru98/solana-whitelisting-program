import path from "path";
import fs from "fs-extra";
import { Keypair, PublicKey } from "@solana/web3.js";
import { WhiteListKeyType } from "../types";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SOLANA_CONNECTION, TOKEN_ACCOUNT_PATHS } from "../constants";

export const KEYS_FOLDER = path.resolve(__dirname, "../", "keys");

export const sleep = (timeInMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeInMs));

async function createDirectories(subDir?: string) {
  await fs.mkdirp(path.resolve(KEYS_FOLDER));
  await fs.mkdirp(path.resolve(KEYS_FOLDER, subDir || "persons"));
}

export const checkKeysDir = async () => fs.pathExists(KEYS_FOLDER);

export const getPublicKey = async (name: string, type?: WhiteListKeyType) => {
  try {
    const publicKey = await fs.readJSON(
      path.resolve(KEYS_FOLDER, type || "persons", name, "publicKey.json")
    );
    return new PublicKey(publicKey);
  } catch (err) {
    return null;
  }
};

export const storePublicKey = async (
  name: string,
  type: WhiteListKeyType,
  publicKey: PublicKey,
  rewrite = false
) => {
  try {
    if (rewrite) {
      await fs.writeJSON(
        path.resolve(KEYS_FOLDER, type, name, "publicKey.json"),
        publicKey.toString()
      );
    }
    return true;
  } catch (err) {
    console.error(err.message);
    return false;
  }
};

export const storeKeypair = async (
  name: string,
  type: WhiteListKeyType,
  rewrite: boolean = false,
  keypair: Keypair = new Keypair()
): Promise<Keypair | null> => {
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

    return keypair;
  } catch (err) {
    console.error(err.message);
    return null;
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

export const getMintToken = async (name: string, payer: Keypair) => {
  const mintPubKey = await fs.readJSON(
    path.resolve(KEYS_FOLDER, "mints", name, "publicKey.json")
  );

  if (mintPubKey) {
    return new Token(
      SOLANA_CONNECTION,
      new PublicKey(mintPubKey),
      TOKEN_PROGRAM_ID,
      payer
    );
  }

  return null;
};

export const getTokenAccount = async (owner: string, token: string) => {
  try {
    const publicKey = await fs.readJSON(
      path.resolve(TOKEN_ACCOUNT_PATHS[token], `${owner}.json`)
    );
    return new PublicKey(publicKey);
  } catch (err) {
    return null;
  }
};

export const storeTokenAccount = async (
  name: string,
  token: string,
  account: PublicKey,
  rewrite: boolean = false
) => {
  try {
    if (rewrite) {
      await fs.writeJSON(
        path.resolve(TOKEN_ACCOUNT_PATHS[token], `${name}.json`),
        account.toString()
      );
    }
    return true;
  } catch (err) {
    return false;
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
