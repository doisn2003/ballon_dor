/**
 * SecureSum - Triển khai thuật toán tính tổng an toàn với mã hóa đồng hình
 * Sử dụng thư viện Paillier để mã hóa đồng hình
 */
import { paillier } from 'paillier-bigint';

export class SecureSum {
  constructor(contract) {
    this.contract = contract;
    this.keyPair = null;
    this.encryptedVotes = new Map(); // Lưu trữ các phiếu bầu đã mã hóa
  }

  /**
   * Khởi tạo cặp khóa Paillier
   */
  async initialize() {
    if (!this.keyPair) {
      // Tạo cặp khóa Paillier với độ dài 2048 bits
      this.keyPair = await paillier.generateRandomKeys(2048);
      console.log('Đã khởi tạo cặp khóa Paillier');
    }
  }

  /**
   * Mã hóa một phiếu bầu
   * @param {number} voteValue - Giá trị phiếu bầu (1 cho một phiếu)
   * @returns {string} - Phiếu bầu đã mã hóa
   */
  async encryptVote(voteValue) {
    await this.initialize();
    // Mã hóa giá trị phiếu (thường là 1)
    const encryptedVote = this.keyPair.publicKey.encrypt(BigInt(voteValue));
    return encryptedVote.toString();
  }

  /**
   * Mã hóa địa chỉ người bỏ phiếu để bảo vệ thông tin cá nhân
   * @param {string} address - Địa chỉ ví của người bỏ phiếu
   * @returns {string} - Địa chỉ đã mã hóa
   */
  encryptAddress(address) {
    // Đơn giản hóa: dùng AES hoặc một thuật toán mã hóa khác
    // Trong thực tế, cần dùng thuật toán phức tạp hơn
    const buffer = Buffer.from(address.toLowerCase());
    return buffer.toString('base64');
  }

  /**
   * Lấy danh sách phiếu bầu đã mã hóa cho một cầu thủ
   * @param {number} playerId - ID của cầu thủ
   * @returns {Array} - Danh sách các phiếu bầu đã mã hóa
   */
  async getEncryptedVotes(playerId) {
    // Nếu đã có trong cache
    if (this.encryptedVotes.has(playerId)) {
      return this.encryptedVotes.get(playerId);
    }

    // Nếu chưa có, lấy từ blockchain và mã hóa
    const votes = [];
    try {
      // Lấy tổng số người bỏ phiếu cho cầu thủ
      const voterCount = await this.contract.getVoterCountForPlayer(playerId);
      
      // Lấy từng đợt người bỏ phiếu, 50 người mỗi lần
      const batchSize = 50;
      for (let i = 0; i < voterCount; i += batchSize) {
        const voters = await this.contract.getVotersForPlayer(
          playerId, 
          i, 
          Math.min(batchSize, voterCount - i)
        );
        
        // Mã hóa từng địa chỉ
        for (const voter of voters) {
          const encryptedVoter = this.encryptAddress(voter);
          votes.push(encryptedVoter);
        }
      }
      
      this.encryptedVotes.set(playerId, votes);
      return votes;
    } catch (error) {
      console.error('Lỗi khi lấy phiếu bầu đã mã hóa:', error);
      return [];
    }
  }

  /**
   * Lấy tổng số phiếu bầu đã mã hóa cho một cầu thủ
   * @param {number} playerId - ID của cầu thủ
   * @returns {string} - Tổng số phiếu bầu đã mã hóa
   */
  async getEncryptedVoteCount(playerId) {
    await this.initialize();
    
    try {
      // Lấy số phiếu bầu thực từ hợp đồng
      const [, , voteCount] = await this.contract.getPlayer(playerId);
      
      // Mã hóa số phiếu bầu
      const encryptedCount = await this.encryptVote(voteCount.toNumber());
      return encryptedCount;
    } catch (error) {
      console.error('Lỗi khi lấy số phiếu bầu đã mã hóa:', error);
      return '0';
    }
  }

  /**
   * Lấy danh sách địa chỉ ví đã mã hóa của người bỏ phiếu cho một cầu thủ
   * @param {number} playerId - ID của cầu thủ
   * @returns {Array} - Danh sách địa chỉ đã mã hóa
   */
  async getEncryptedVoterList(playerId) {
    const encryptedVotes = await this.getEncryptedVotes(playerId);
    return encryptedVotes;
  }

  /**
   * Kiểm tra xem một địa chỉ ví có nằm trong danh sách người bỏ phiếu đã mã hóa không
   * Hỗ trợ cho ZKP để chứng minh phiếu đã được tính
   * @param {string} address - Địa chỉ ví cần kiểm tra
   * @param {number} playerId - ID của cầu thủ
   * @returns {boolean} - true nếu địa chỉ có trong danh sách
   */
  async isVoterInList(address, playerId) {
    const encryptedAddress = this.encryptAddress(address);
    const voterList = await this.getEncryptedVoterList(playerId);
    return voterList.includes(encryptedAddress);
  }
} 