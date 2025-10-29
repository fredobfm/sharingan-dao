import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FHESharinganDao, FHESharinganDao__factory } from "../types";

type TestUsers = {
  admin: HardhatEthersSigner;
  itachi: HardhatEthersSigner;
  sasuke: HardhatEthersSigner;
  kakashi: HardhatEthersSigner;
  naruto: HardhatEthersSigner;
};

async function setupDeployment() {
  const factory = (await ethers.getContractFactory("FHESharinganDao")) as FHESharinganDao__factory;
  const contract = (await factory.deploy()) as FHESharinganDao;
  return { contract, address: await contract.getAddress() };
}

describe("FHESharinganDao — Extended Test Suite", function () {
  let users: TestUsers;
  let dao: FHESharinganDao;
  let daoAddress: string;

  before(async () => {
    const [admin, itachi, sasuke, kakashi, naruto] = await ethers.getSigners();
    users = { admin, itachi, sasuke, kakashi, naruto };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ contract: dao, address: daoAddress } = await setupDeployment());
  });

  it("should start with all users unvoted", async () => {
    for (const user of Object.values(users)) {
      expect(await dao.hasUserVoted(user.address)).to.eq(false);
    }
  });

  it("should allow votes for different Uchiha eyes", async () => {
    const eyes = [{ eyeId: 1 }, { eyeId: 2 }, { eyeId: 3 }, { eyeId: 4 }];

    const signers = Object.values(users);

    for (let i = 0; i < eyes.length; i++) {
      const voter = signers[i];
      const { eyeId } = eyes[i];

      const enc = await fhevm.createEncryptedInput(daoAddress, voter.address).add32(eyeId).encrypt();

      await (await dao.connect(voter).castVote(enc.handles[0], enc.inputProof)).wait();
    }

    for (let i = 0; i < eyes.length; i++) {
      const voter = signers[i];
      const { eyeId } = eyes[i];

      const stored = await dao.getEncryptedVote(voter.address);
      const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, voter);

      expect(decrypted).to.eq(eyeId);
    }
  });

  it("should update user’s vote if they choose a new option", async () => {
    const user = users.sasuke;
    const first = 3;
    const second = 8;

    const enc1 = await fhevm.createEncryptedInput(daoAddress, user.address).add32(first).encrypt();
    await (await dao.connect(user).castVote(enc1.handles[0], enc1.inputProof)).wait();

    const enc2 = await fhevm.createEncryptedInput(daoAddress, user.address).add32(second).encrypt();
    await (await dao.connect(user).castVote(enc2.handles[0], enc2.inputProof)).wait();

    const stored = await dao.getEncryptedVote(user.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, user);
    expect(decrypted).to.eq(second);
  });

  it("should store and decrypt maximum uint32 vote", async () => {
    const choice = 2 ** 32 - 1;
    const enc = await fhevm.createEncryptedInput(daoAddress, users.naruto.address).add32(choice).encrypt();

    await (await dao.connect(users.naruto).castVote(enc.handles[0], enc.inputProof)).wait();

    const stored = await dao.getEncryptedVote(users.naruto.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, users.naruto);
    expect(decrypted).to.eq(choice);
  });

  it("should return empty encrypted value for new users", async () => {
    const unvoted = users.kakashi.address;
    const value = await dao.getEncryptedVote(unvoted);
    expect(value).to.eq(ethers.ZeroHash);
  });

  it("should persist unique votes for each participant", async () => {
    const ninjas = [users.itachi, users.kakashi, users.naruto];
    const votes = [1, 5, 8];

    for (let i = 0; i < ninjas.length; i++) {
      const enc = await fhevm.createEncryptedInput(daoAddress, ninjas[i].address).add32(votes[i]).encrypt();
      await (await dao.connect(ninjas[i]).castVote(enc.handles[0], enc.inputProof)).wait();
    }

    for (let i = 0; i < ninjas.length; i++) {
      const stored = await dao.getEncryptedVote(ninjas[i].address);
      const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, ninjas[i]);
      expect(decrypted).to.eq(votes[i]);
    }
  });

  it("should handle multiple updates and preserve latest value", async () => {
    const user = users.sasuke;
    const values = [1, 4, 7, 10];

    for (const v of values) {
      const enc = await fhevm.createEncryptedInput(daoAddress, user.address).add32(v).encrypt();
      await (await dao.connect(user).castVote(enc.handles[0], enc.inputProof)).wait();
    }

    const stored = await dao.getEncryptedVote(user.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, user);
    expect(decrypted).to.eq(values.at(-1));
  });

  it("should maintain state after consecutive castVote calls", async () => {
    const user = users.kakashi;
    for (let i = 0; i < 5; i++) {
      const enc = await fhevm.createEncryptedInput(daoAddress, user.address).add32(i).encrypt();
      await (await dao.connect(user).castVote(enc.handles[0], enc.inputProof)).wait();
    }
    const stored = await dao.getEncryptedVote(user.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, user);
    expect(decrypted).to.eq(4);
  });

  it("should ensure one user's vote doesn't affect others", async () => {
    const itachiEnc = await fhevm.createEncryptedInput(daoAddress, users.itachi.address).add32(1).encrypt();
    const kakashiEnc = await fhevm.createEncryptedInput(daoAddress, users.kakashi.address).add32(5).encrypt();

    await (await dao.connect(users.itachi).castVote(itachiEnc.handles[0], itachiEnc.inputProof)).wait();
    await (await dao.connect(users.kakashi).castVote(kakashiEnc.handles[0], kakashiEnc.inputProof)).wait();

    const itachiVote = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await dao.getEncryptedVote(users.itachi.address),
      daoAddress,
      users.itachi,
    );
    const kakashiVote = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await dao.getEncryptedVote(users.kakashi.address),
      daoAddress,
      users.kakashi,
    );

    expect(itachiVote).to.eq(1);
    expect(kakashiVote).to.eq(5);
  });

  it("should remain consistent when users re-vote same number", async () => {
    const user = users.itachi;
    const choice = 6;

    const enc1 = await fhevm.createEncryptedInput(daoAddress, user.address).add32(choice).encrypt();
    await (await dao.connect(user).castVote(enc1.handles[0], enc1.inputProof)).wait();

    const enc2 = await fhevm.createEncryptedInput(daoAddress, user.address).add32(choice).encrypt();
    await (await dao.connect(user).castVote(enc2.handles[0], enc2.inputProof)).wait();

    const stored = await dao.getEncryptedVote(user.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored, daoAddress, user);
    expect(decrypted).to.eq(choice);
  });
});
