"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

/**
 * @hook useFHESharinganDao
 * @description Custom hook to interact with FHESharinganDao contract (encrypted voting dApp for Uchiha eyes).
 */
export const useFHESharinganWagmi = (params: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = params;

  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;

  const { data: fheSharinganDao } = useDeployedContractInfo({
    contractName: "FHESharinganDao",
    chainId: allowedChainId,
  });

  type FHESharinganDaoInfo = Contract<"FHESharinganDao"> & { chainId?: number };

  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const hasContract = Boolean(fheSharinganDao?.address && fheSharinganDao?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      fheSharinganDao!.address,
      (fheSharinganDao as FHESharinganDaoInfo).abi,
      providerOrSigner
    );
  };

  // === READ ENCRYPTED VOTE ===
  const {
    data: encryptedVoteHandle,
    refetch: reloadVoteHandle,
    isFetching: isReloading,
  } = useReadContract({
    address: hasContract ? (fheSharinganDao!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((fheSharinganDao as FHESharinganDaoInfo).abi as any) : undefined,
    functionName: "getEncryptedVote" as const,
    args: [accounts ? accounts[0] : ""],
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const voteHandle = useMemo(
    () => (encryptedVoteHandle as string | undefined) ?? undefined,
    [encryptedVoteHandle],
  );

  const hasVoted = useMemo(() => {
    if (!voteHandle) return false;
    if (voteHandle === ethers.ZeroHash || voteHandle === "0x" || voteHandle === "0x0") return false;
    return true;
  }, [voteHandle]);

  const decryptRequests = useMemo(() => {
    if (!hasContract || !voteHandle || voteHandle === ethers.ZeroHash) return undefined;
    return [{ handle: voteHandle, contractAddress: fheSharinganDao!.address }] as const;
  }, [hasContract, fheSharinganDao?.address, voteHandle]);

  // === DECRYPT ===
  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decryptMsg,
    results,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests: decryptRequests,
  });

  const [voteResult, setVoteResult] = useState<string>("");

  useEffect(() => {
    if (decryptMsg) setVoteResult(decryptMsg);
  }, [decryptMsg]);

  const decryptedVote = useMemo(() => {
    if (!voteHandle) return undefined;
    const value = results?.[voteHandle];
    if (typeof value === "undefined") return undefined;
    return BigInt(value);
  }, [voteHandle, results]);

  const isVoteDecrypted = useMemo(
    () => typeof decryptedVote !== "undefined" && BigInt(decryptedVote) !== BigInt(0),
    [decryptedVote],
  );

  const decryptMyVote = decrypt;

  // === ENCRYPTION ===
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: fheSharinganDao?.address,
  });

  const canVote = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isBusy),
    [hasContract, instance, hasSigner, isBusy],
  );

  const getEncryptionMethodFor = (functionName: "castVote") => {
    const fnAbi = fheSharinganDao?.abi.find(item => item.type === "function" && item.name === functionName);
    if (!fnAbi || !fnAbi.inputs?.length) {
      return { method: undefined as string | undefined, error: `Function ABI not found for ${functionName}` };
    }
    const firstInput = fnAbi.inputs[0]!;
    return { method: getEncryptionMethod(firstInput.internalType), error: undefined };
  };

  // === CAST / UPDATE VOTE ===
  const castVote = useCallback(
    async (eyeId: number) => {
      if (isBusy || !canVote || eyeId <= 0) return;
      setIsBusy(true);
      setStatusMessage(`Encrypting and voting for eye ID ${eyeId}...`);
      try {
        const { method, error } = getEncryptionMethodFor("castVote");
        if (!method) return setStatusMessage(error ?? "Encryption method not found");

        const enc = await encryptWith(builder => {
          (builder as any)[method](eyeId);
        });
        if (!enc) return setStatusMessage("Encryption failed");

        const writeContract = getContract("write");
        if (!writeContract) return setStatusMessage("Signer not available");

        const params = buildParamsFromAbi(enc, [...fheSharinganDao!.abi] as any[], "castVote");
        const tx = await writeContract.castVote(...params, { gasLimit: 300_000 });

        setStatusMessage("Waiting for transaction confirmation...");
        await tx.wait();
        setStatusMessage(`Successfully voted for eye ID ${eyeId}!`);
        await reloadVoteHandle();
      } catch (err) {
        setStatusMessage(`castVote() failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, canVote, encryptWith, getContract, reloadVoteHandle, fheSharinganDao?.abi],
  );

  // === RESET STATUS WHEN WALLET CHANGES ===
  useEffect(() => {
    setStatusMessage("");
  }, [accounts, chainId]);

  return {
    contractAddress: fheSharinganDao?.address,
    canVote,
    canDecrypt,
    decryptMyVote,
    castVote,
    reloadVoteHandle,
    isVoteDecrypted,
    decryptedVote,
    statusMessage,
    isDecrypting,
    isReloading,
    isBusy,
    hasVoted,
    chainId,
    accounts,
    isConnected,
    ethersSigner,
  };
};
