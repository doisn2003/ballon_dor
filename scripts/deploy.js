// Script để deploy hợp đồng GoldenBallVoting
const hre = require("hardhat");

async function main() {
  console.log("Bắt đầu deploy hợp đồng GoldenBallVoting...");

  // Lấy thời gian hiện tại + 10 phút để làm thời gian bắt đầu cuộc bỏ phiếu
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const startTime = currentTimestamp + 600; // Bắt đầu sau 10 phút
  const durationInMinutes = 4320; // Kéo dài trong 3 ngày (3 * 24 * 60 = 4320 phút)

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

  console.log("Hoàn tất quá trình deploy!");
  console.log(`Thời gian bắt đầu cuộc bỏ phiếu: ${new Date(startTime * 1000)}`);
  console.log(`Thời gian kết thúc cuộc bỏ phiếu: ${new Date((startTime + durationInMinutes * 60) * 1000)}`);
}

// Thực thi hàm main và xử lý lỗi
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });