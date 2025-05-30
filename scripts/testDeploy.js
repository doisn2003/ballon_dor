// Script để deploy hợp đồng GoldenBallVoting trên mạng hardhat local
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Bắt đầu deploy hợp đồng GoldenBallVoting trên mạng hardhat...");

  // Lấy thời gian hiện tại (Unix timestamp)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // Bắt đầu ngay lập tức
  const startTime = currentTimestamp;
  // Kéo dài trong 1 giờ
  const durationInMinutes = 60;

  // Deploy hợp đồng
  const GoldenBallVoting = await hre.ethers.getContractFactory("GoldenBallVoting");
  const voting = await GoldenBallVoting.deploy(startTime, durationInMinutes);

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log(`GoldenBallVoting đã được deploy thành công tại địa chỉ: ${address}`);

  // Cập nhật địa chỉ contract trong file index.js
  /*try {
    const indexFilePath = path.join(__dirname, "../pages/index.js");
    let indexFileContent = fs.readFileSync(indexFilePath, "utf8");
    
    // Tìm và thay thế dòng địa chỉ hợp đồng
    indexFileContent = indexFileContent.replace(
      /const contractAddress = ".*";/,
      `const contractAddress = "${address}"; // Địa chỉ hợp đồng đã deploy`
    );
    
    fs.writeFileSync(indexFilePath, indexFileContent);
    console.log(`Đã cập nhật địa chỉ hợp đồng trong file index.js thành công!`);
  } catch (error) {
    console.error("Lỗi khi cập nhật địa chỉ hợp đồng:", error);
  }*/

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
  console.log(`Thời gian bắt đầu cuộc bỏ phiếu: ${new Date(startTime * 1000).toLocaleString()}`);
  console.log(`Thời gian kết thúc cuộc bỏ phiếu: ${new Date((startTime + durationInMinutes * 60) * 1000).toLocaleString()}`);
  console.log("----------------------------------------------------");
  console.log("Phảikết nối MetaMask với mạng Hardhat (http://localhost:8545)");

}

// Thực thi hàm main và xử lý lỗi
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });