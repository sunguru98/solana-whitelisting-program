import {
  TokenSwap,
  TokenSwapLayout,
  TOKEN_SWAP_PROGRAM_ID,
} from "@solana/spl-token-swap";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { SOLANA_CONNECTION } from "../constants";

export async function createTokenSwap(
  payer: Keypair,
  swapAccountKeypair: Keypair,
  swapAuthority: PublicKey,
  tokenAccountA: PublicKey,
  tokenAccountB: PublicKey,
  poolMintToken: PublicKey,
  feeAccount: PublicKey,
  tokenAccountPool: PublicKey,
  tokenProgramId: PublicKey,
  swapProgramId: PublicKey,
  tradeFeeNumerator: number,
  tradeFeeDenominator: number,
  ownerTradeFeeNumerator: number,
  ownerTradeFeeDenominator: number,
  ownerWithdrawFeeNumerator: number,
  ownerWithdrawFeeDenominator: number,
  hostFeeNumerator: number,
  hostFeeDenominator: number,
  curveType: number,
  pricePerTokenB: number
) {
  const minLamportsNeeded = await TokenSwap.getMinBalanceRentForExemptTokenSwap(
    SOLANA_CONNECTION
  );

  const createNewAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: swapAccountKeypair.publicKey,
    lamports: minLamportsNeeded,
    space: TokenSwapLayout.span,
    programId: TOKEN_SWAP_PROGRAM_ID,
  });

  const keys = [
    { pubkey: swapAccountKeypair.publicKey, isSigner: true, isWritable: true },
    { pubkey: swapAuthority, isSigner: false, isWritable: false },
    { pubkey: tokenAccountA, isSigner: false, isWritable: false },
    { pubkey: tokenAccountB, isSigner: false, isWritable: false },
    { pubkey: poolMintToken, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: false },
    { pubkey: tokenAccountPool, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

  const initBuffer = Buffer.alloc(32);
  Buffer.from(Uint8Array.of(...new BN(pricePerTokenB).toArray("le", 8))).copy(
    initBuffer
  );

  const instructionData = Buffer.from(
    Uint8Array.of(
      0,
      ...new BN(tradeFeeNumerator).toArray("le", 8),
      ...new BN(tradeFeeDenominator).toArray("le", 8),
      ...new BN(ownerTradeFeeNumerator).toArray("le", 8),
      ...new BN(ownerTradeFeeDenominator).toArray("le", 8),
      ...new BN(ownerWithdrawFeeNumerator).toArray("le", 8),
      ...new BN(ownerWithdrawFeeDenominator).toArray("le", 8),
      ...new BN(hostFeeNumerator).toArray("le", 8),
      ...new BN(hostFeeDenominator).toArray("le", 8),
      curveType,
      ...initBuffer
    )
  );

  const createTokenSwapIx = new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data: instructionData,
  });

  await SOLANA_CONNECTION.sendTransaction(
    new Transaction().add(createNewAccountIx, createTokenSwapIx),
    [payer, swapAccountKeypair],
    { preflightCommitment: "confirmed", skipPreflight: false }
  );
}
