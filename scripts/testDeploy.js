const hre = require("hardhat");

async function main() {
  console.log("Bắt đầu test deploy và giả lập bỏ phiếu cho hợp đồng GoldenBallVoting...");

  // Lấy thời gian hiện tại (Unix timestamp)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // Bắt đầu ngay lập tức
  const startTime = currentTimestamp;
  // Kéo dài trong 1 phút để dễ dàng giả lập kết thúc
  const durationInMinutes = 1;

  // Deploy hợp đồng
  const GoldenBallVoting = await hre.ethers.getContractFactory("GoldenBallVoting");
  const voting = await GoldenBallVoting.deploy(startTime, durationInMinutes);
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  console.log(`GoldenBallVoting đã được deploy thành công tại địa chỉ: ${address}`);

  // Thêm 10 cầu thủ
  const players = [
    { name: "Lionel Messi", team: "Inter Miami CF" },
    { name: "Cristiano Ronaldo", team: "Al-Nassr FC" },
    { name: "Erling Haaland", team: "Manchester City" },
    { name: "Kylian Mbappé", team: "Real Madrid" },
    { name: "Mohamed Salah", team: "Liverpool" },
    { name: "Kevin De Bruyne", team: "Manchester City" },
    { name: "Vinícius Júnior", team: "Real Madrid" },
    { name: "Robert Lewandowski", team: "Barcelona" },
    { name: "Jude Bellingham", team: "Real Madrid" },
    { name: "Harry Kane", team: "Bayern Munich" }
  ];

  console.log("Thêm các cầu thủ vào danh sách...");
  for (const player of players) {
    const transaction = await voting.addPlayer(player.name, player.team);
    await transaction.wait();
    console.log(`Đã thêm cầu thủ: ${player.name} từ đội ${player.team}`);
  }

  // Giả lập các phiếu bầu
  const voteCounts = {
    "Lionel Messi": 6,
    "Cristiano Ronaldo": 4,
    "Harry Kane": 2
  };

  // Lấy danh sách các tài khoản từ Hardhat
  const signers = await hre.ethers.getSigners();
  let voterIndex = 1; // Bắt đầu từ 1 vì 0 là owner

  // Hàm để bỏ phiếu cho một cầu thủ với số lượng phiếu nhất định
  async function voteForPlayer(playerName, count) {
    const playerId = players.findIndex(p => p.name === playerName);
    if (playerId === -1) throw new Error(`Không tìm thấy cầu thủ: ${playerName}`);
    for (let i = 0; i < count; i++) {
      if (voterIndex >= signers.length) throw new Error("Không đủ tài khoản để bỏ phiếu");
      const voter = signers[voterIndex];
      await voting.connect(voter).vote(playerId);
      voterIndex++;
    }
    console.log(`Đã bỏ ${count} phiếu cho ${playerName}`);
  }

  console.log("Giả lập bỏ phiếu...");
  await voteForPlayer("Lionel Messi", voteCounts["Lionel Messi"]);
  await voteForPlayer("Cristiano Ronaldo", voteCounts["Cristiano Ronaldo"]);
  await voteForPlayer("Harry Kane", voteCounts["Harry Kane"]);

  // Bỏ phiếu cho các cầu thủ còn lại, mỗi người 50 phiếu
  for (const player of players) {
    if (!voteCounts[player.name]) {
      await voteForPlayer(player.name, 1);
    }
  }

  // Giả lập thời gian để kết thúc cuộc bỏ phiếu
  console.log("Kết thúc thời gian bỏ phiếu...");
  const durationInSeconds = durationInMinutes * 60;
  await hre.network.provider.send("evm_increaseTime", [durationInSeconds]);
  await hre.network.provider.send("evm_mine");

  // Kiểm tra người chiến thắng
  const [winnerId, winnerName, winningVoteCount] = await voting.getWinner();
  console.log(`Người chiến thắng: ${winnerName} với ${winningVoteCount} phiếu bầu.`);

  // Công bố kết quả
  const owner = signers[0];
  await voting.connect(owner).announceResult();
  console.log("Đã công bố kết quả.");

  console.log("Hoàn tất quá trình test và giả lập!");
}

main()
  .catch((error) => {
    console.error("Lỗi:", error);
    process.exit(1);
  });