import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Đường dẫn tới file .env.local
const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  try {
    // Kiểm tra xem file .env.local có tồn tại không
    if (!fs.existsSync(ENV_FILE_PATH)) {
      return NextResponse.json({
        isDeployed: false,
        message: 'Hợp đồng chưa được triển khai'
      });
    }

    // Đọc file .env.local
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    // Tìm địa chỉ hợp đồng trong file .env.local
    const contractAddressMatch = envContent.match(/NEXT_PUBLIC_CONTRACT_ADDRESS=([a-zA-Z0-9]+)/);
    
    if (contractAddressMatch && contractAddressMatch[1]) {
      return NextResponse.json({
        isDeployed: true,
        address: contractAddressMatch[1],
        message: 'Hợp đồng đã được triển khai'
      });
    }
    
    return NextResponse.json({
      isDeployed: false,
      message: 'Không tìm thấy địa chỉ hợp đồng trong file cấu hình'
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái hợp đồng:', error);
    return NextResponse.json(
      { isDeployed: false, message: `Lỗi: ${error.message}` },
      { status: 500 }
    );
  }
} 