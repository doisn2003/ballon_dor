import { exec } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Đường dẫn tới thư mục .env trong thư mục gốc của dự án
const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

export async function POST(request) {
  try {
    const body = await request.json();
    const { startTime, durationInMinutes, players } = body;
    
    if (!startTime || !durationInMinutes) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin thời gian bỏ phiếu' },
        { status: 400 }
      );
    }
    
    console.log('Triển khai hợp đồng với thông số:', {
      startTime,
      durationInMinutes,
      players: players?.length || 0
    });

    // Tạo tệp script triển khai tạm thời
    const deployScriptContent = `
const hre = require("hardhat");

async function main() {
  console.log("Bắt đầu deploy hợp đồng GoldenBallVoting...");

  // Thời gian bắt đầu và thời lượng từ tham số
  const startTime = ${startTime};
  const durationInMinutes = ${durationInMinutes};

  // Deploy hợp đồng
  const GoldenBallVoting = await hre.ethers.getContractFactory("GoldenBallVoting");
  const voting = await GoldenBallVoting.deploy(startTime, durationInMinutes);
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log(\`GoldenBallVoting đã được deploy thành công tại địa chỉ: \${address}\`);

  // Thêm danh sách cầu thủ
  const players = ${JSON.stringify(players || [])};
  
  console.log("Thêm các cầu thủ vào danh sách...");
  for (const player of players) {
    const transaction = await voting.addPlayer(player.name, player.team);
    await transaction.wait();
    console.log(\`Đã thêm cầu thủ: \${player.name} từ đội \${player.team}\`);
  }

  // Trả về địa chỉ contract để lưu vào .env
  return address;
}

main()
  .then((address) => {
    console.log("CONTRACT_ADDRESS=" + address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

    // Lưu tệp script tạm thời
    const tempScriptPath = path.join(process.cwd(), 'scripts/tempDeploy.js');
    await writeFile(tempScriptPath, deployScriptContent);
    
    // Chạy script triển khai
    console.log('Chạy script triển khai...');
    const { stdout, stderr } = await execAsync('npx hardhat run scripts/tempDeploy.js --network hardhat');
    
    console.log('Script output:', stdout);
    if (stderr) console.error('Script errors:', stderr);
    
    // Trích xuất địa chỉ hợp đồng từ đầu ra
    const contractAddressMatch = stdout.match(/CONTRACT_ADDRESS=([a-zA-Z0-9]+)/);
    if (!contractAddressMatch || !contractAddressMatch[1]) {
      throw new Error('Không thể lấy địa chỉ hợp đồng từ đầu ra script');
    }
    
    const contractAddress = contractAddressMatch[1];
    console.log('Địa chỉ hợp đồng:', contractAddress);
    
    // Cập nhật hoặc tạo tệp .env với địa chỉ hợp đồng
    await writeFile(ENV_FILE_PATH, `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`);
    
    return NextResponse.json({
      success: true,
      contractAddress,
      message: 'Hợp đồng đã được triển khai thành công'
    });
  } catch (error) {
    console.error('Lỗi triển khai hợp đồng:', error);
    return NextResponse.json(
      { success: false, message: `Lỗi triển khai hợp đồng: ${error.message}` },
      { status: 500 }
    );
  }
} 