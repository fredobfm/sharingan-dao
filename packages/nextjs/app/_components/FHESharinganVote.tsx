"use client";

import { useMemo, useState } from "react";
import { SHARINGAN_EYES } from "~~/constants/index";
import { useFhevm } from "@fhevm-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHESharinganWagmi } from "~~/hooks/useFHESharinganWagmi";

import CircleLoader from "react-spinners/CircleLoader";

export const FHESharinganVote = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const sharingan = useFHESharinganWagmi({
    instance: fhevmInstance,
    initialMockChains,
  });

  const [selectedEye, setSelectedEye] = useState<number | null>(null);

  async function handleVote(id: number) {
    if (!sharingan.canVote) return;
    setSelectedEye(id);
    await sharingan.castVote(id);
  }

  // 🧧 Nếu chưa connect ví
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto p-8 text-gray-900 text-center flex items-center"
        style={{ height: "calc(100vh - 60px)" }}
      >
        <div className="bg-black/70 border border-red-600 shadow-xl rounded-xl p-10 text-white">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-3">Wallet not connected</h2>
          <p className="text-gray-300 mb-6">Connect your wallet to vote for your favorite Sharingan.</p>
          <RainbowKitCustomConnectButton />
        </div>
      </motion.div>
    );
  }

  const decryptedEyeId = sharingan.isVoteDecrypted && sharingan.decryptedVote ? Number(sharingan.decryptedVote) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative w-full text-white overflow-hidden"
    >
      {/* 🔥 Red-black animated background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Overlay loading */}
      {sharingan.isBusy && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <CircleLoader color="#ff0000" size={45} />
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-8 relative z-10">
        {/* 🌀 Title */}
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="9.png"
              alt="Sharingan"
              className="w-10 h-10 md:w-14 md:h-14 animate-pulse drop-shadow-[0_0_10px_#ff0000]"
            />
            <h1 className="text-3xl md:text-5xl font-extrabold text-red-500 drop-shadow-lg">Sharingan Voting</h1>
          </div>
          <p className="text-gray-300">Vote privately for the most powerful eye in Naruto.</p>
        </motion.div>

        {/* 🩸 Grid of eyes */}
        <motion.div
          className="bg-black/50 border border-red-700 shadow-xl p-6 rounded-2xl backdrop-blur-sm"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {SHARINGAN_EYES.map(eye => {
              const isSelected = selectedEye === eye.id;
              const isDecryptedVoted = decryptedEyeId === eye.id;

              const borderClass = isDecryptedVoted
                ? "border-red-500 shadow-red-600/70"
                : isSelected
                  ? "border-red-300 shadow-red-400/40"
                  : "border-red-900";

              return (
                <motion.div
                  key={eye.id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    show: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleVote(eye.id)}
                  className={`relative flex items-center justify-center p-6 rounded-2xl cursor-pointer transition-all duration-200 bg-black border ${borderClass}`}
                >
                  <motion.img
                    src={eye.image}
                    alt={`Eye ${eye.id}`}
                    className="w-28 h-28 object-contain rounded-full animate-pulse drop-shadow-[0_0_10px_#ff0000]"
                    animate={{
                      rotate: eye.id % 2 === 0 ? [0, -360] : [0, 360],
                      scale: isDecryptedVoted ? [1, 1.1, 1] : 1,
                      filter: isDecryptedVoted
                        ? ["brightness(1)", "brightness(1.4)", "brightness(1)"]
                        : ["brightness(1)", "brightness(1.2)", "brightness(1)"],
                    }}
                    transition={{
                      rotate: { repeat: Infinity, duration: 6, ease: "linear" },
                      scale: { repeat: isDecryptedVoted ? Infinity : 0, duration: 2, ease: "easeInOut" },
                      filter: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    }}
                  />

                  {isDecryptedVoted && (
                    <>
                      {/* 💥 Glowing aura behind the eye */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl blur-xl"
                        style={{
                          background: "radial-gradient(circle, rgba(255,0,0,0.6) 0%, transparent 70%)",
                        }}
                        animate={{
                          opacity: [0.6, 1, 0.6],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeInOut",
                        }}
                      />
                      {/* 💫 Sparkling center dot */}
                      <motion.div
                        className="absolute w-6 h-6 rounded-full bg-red-500 shadow-[0_0_15px_#ff0000] top-3 right-3"
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.8, 1, 0.8],
                          filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.6,
                          ease: "easeInOut",
                        }}
                      />
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 🔐 Decryption Panel */}
        <motion.div
          className="relative bg-gradient-to-b from-black/70 via-black/80 to-red-950/40 border border-red-700/80 shadow-[0_0_25px_rgba(255,0,0,0.3)] p-6 rounded-2xl backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {/* 🔄 Background rotating aura */}
          <motion.div
            className="absolute inset-0 -z-10 opacity-40"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            style={{
              background: "radial-gradient(circle at center, rgba(255,0,0,0.3) 0%, transparent 70%)",
            }}
          />

          <h3 className="text-2xl font-bold text-red-400 mb-5 border-b border-red-700/60 pb-2 tracking-wide flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              🔐
            </motion.span>
            My Encrypted Vote
          </h3>

          {/* 🧾 Info list */}
          <div className="space-y-2 mb-6">
            {printProperty("Vote handle", sharingan.hasVoted ? "✓ Yes" : "✗ No")}
            {printProperty(
              "Decrypted value",
              sharingan.isVoteDecrypted ? String(sharingan.decryptedVote) : "Not decrypted yet",
            )}
          </div>

          {/* 🧨 Action button */}
          <motion.button
            disabled={!sharingan.canDecrypt}
            onClick={sharingan.decryptMyVote}
            whileHover={sharingan.canDecrypt ? { scale: 1.08, boxShadow: "0 0 15px #ff0000aa" } : {}}
            whileTap={sharingan.canDecrypt ? { scale: 0.95 } : {}}
            className={`relative inline-flex items-center justify-center px-8 py-3 rounded-lg font-semibold tracking-wide overflow-hidden
      transition-all duration-300 ${
        sharingan.canDecrypt
          ? "bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white"
          : "bg-gray-800 text-gray-400 cursor-not-allowed"
      }`}
          >
            {sharingan.isDecrypting ? (
              <motion.span
                className="flex items-center gap-2 pl--5"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                ⏳ Decrypting...
              </motion.span>
            ) : sharingan.canDecrypt ? (
              <>
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-transparent to-red-500/20"
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                />
                <span className="relative z-10">🔓 Decrypt My Vote</span>
              </>
            ) : (
              "❌ Nothing to decrypt"
            )}
          </motion.button>
        </motion.div>

        {/* 💬 Status message */}
        <AnimatePresence>
          {sharingan.statusMessage && (
            <motion.div
              className="bg-black/60 border border-red-700 p-6 rounded-2xl shadow-lg backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl font-bold text-red-400 mb-4 border-b border-red-700 pb-2">💬 Status</h3>
              <div className="border bg-black/70 border-red-800 p-4 rounded-md">
                <p className="text-gray-200">{sharingan.statusMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

function printProperty(name: string, value: unknown) {
  const val =
    typeof value === "boolean"
      ? value
        ? "✓ true"
        : "✗ false"
      : typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value ?? "undefined");

  return (
    <div className="flex justify-between items-center py-2 px-3 bg-black/40 border border-red-800 rounded-md mb-2">
      <span className="font-medium text-red-300">{name}</span>
      <span
        className={`font-mono text-sm px-2 py-1 rounded ${
          val.includes("true") ? "text-green-400" : val.includes("false") ? "text-red-500" : "text-gray-200"
        }`}
      >
        {val}
      </span>
    </div>
  );
}
