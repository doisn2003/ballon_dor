// Script để deploy hợp đồng GoldenBallVoting với Account #0
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Bắt đầu deploy hợp đồng GoldenBallVoting với Account #0...");

  // Lấy tất cả signers
  const signers = await hre.ethers.getSigners();
  const owner = signers[0]; // Account #0
  
  console.log(`Sử dụng Account #0: ${owner.address}`);

  // Lấy thời gian hiện tại (Unix timestamp)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // Bắt đầu ngay lập tức
  const startTime = currentTimestamp;
  // Kéo dài trong 1 giờ
  const durationInMinutes = 60;

  // Deploy hợp đồng với Account #0
  const GoldenBallVoting = await hre.ethers.getContractFactory("GoldenBallVoting");
  const voting = await GoldenBallVoting.connect(owner).deploy(startTime, durationInMinutes);

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log(`GoldenBallVoting đã được deploy thành công tại địa chỉ: ${address}`);
  console.log(`Owner của hợp đồng: ${owner.address}`);

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
    const transaction = await voting.connect(owner).addPlayer(player.name, player.team);
    await transaction.wait();
    console.log(`Đã thêm cầu thủ: ${player.name} từ đội ${player.team}`);
  }

  // Tạo file .env.local với địa chỉ hợp đồng mới
  const envFilePath = path.join(__dirname, "../.env.local");
  const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`;
  
  fs.writeFileSync(envFilePath, envContent);
  console.log(`Đã tạo file .env.local với địa chỉ: ${address}`);

  console.log("Hoàn tất quá trình deploy!");
  console.log(`Thời gian bắt đầu cuộc bỏ phiếu: ${new Date(startTime * 1000).toLocaleString()}`);
  console.log(`Thời gian kết thúc cuộc bỏ phiếu: ${new Date((startTime + durationInMinutes * 60) * 1000).toLocaleString()}`);
  console.log("----------------------------------------------------");
  console.log("Hãy kết nối MetaMask với Account #0 để có quyền admin");
  console.log(`Account #0: ${owner.address}`);

  return address;
}

// Thực thi hàm main và xử lý lỗi
main()
  .then((address) => {
    console.log("CONTRACT_ADDRESS=" + address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });