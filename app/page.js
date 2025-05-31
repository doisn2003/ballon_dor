'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ABI của hợp đồngg
const contractABI = [
  "function owner() view returns (address)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function playerCount() view returns (uint8)",
  "function hasVoted(address) view returns (bool)",
  "function players(uint8) view returns (string, string, uint256)",
  "function getPlayer(uint8) view returns (string, string, uint256)",
  "function vote(uint8) public",
  "function getWinner() view returns (uint8, string, uint256)"
];

// Địa chỉ hợp đồng
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const Home = () => {
  // States
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState({});
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [votingTimeInfo, setVotingTimeInfo] = useState({ started: false, ended: false, timeLeft: '' });
  const [error, setError] = useState('');

  // Kết nối với MetaMask
  const connectWallet = async () => {
    try {
      setError('');
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(provider);
        
        // Khởi tạo contract
        const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(votingContract);

        // Kiểm tra người dùng đã bỏ phiếu chưa
        if (accounts[0]) {
          const voted = await votingContract.hasVoted(accounts[0]);
          setHasUserVoted(voted);
        }

        // Lấy thông tin thời gian
        await getVotingTimeInfo(votingContract);

        // Lấy danh sách cầu thủ
        await getPlayers(votingContract);

        // Kiểm tra kết quả nếu cuộc bỏ phiếu đã kết thúc
        if (votingTimeInfo.ended) {
          try {
            const winnerInfo = await votingContract.getWinner();
            setWinner({
              id: Number(winnerInfo[0]),
              name: winnerInfo[1],
              votes: Number(winnerInfo[2])
            });
          } catch (error) {
            console.log("Không thể lấy thông tin người chiến thắng:", error);
          }
        }
      } else {
        setError('Vui lòng cài đặt MetaMask để sử dụng ứng dụng này');
      }
    } catch (error) {
      console.error("Lỗi kết nối ví:", error);
      setError('Không thể kết nối với ví. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông tin thời gian bỏ phiếu
  const getVotingTimeInfo = async (contract) => {
    try {
      if (!contract) return;
      
      const startTimeData = await contract.startTime();
      const endTimeData = await contract.endTime();
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(startTimeData);
      const endTime = Number(endTimeData);
      
      const started = now >= startTime;
      const ended = now >= endTime;
      
      let timeLeft = '';
      if (!started) {
        timeLeft = `Bắt đầu sau ${formatTime(startTime - now)}`;
      } else if (!ended) {
        timeLeft = `Còn lại ${formatTime(endTime - now)}`;
      } else {
        timeLeft = 'Cuộc bỏ phiếu đã kết thúc';
      }
      
      setVotingTimeInfo({ started, ended, timeLeft, startTime, endTime });
    } catch (error) {
      console.error("Lỗi lấy thông tin thời gian:", error);
    }
  };

  // Định dạng thời gian
  const formatTime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days} ngày, ${hours} giờ`;
    } else if (hours > 0) {
      return `${hours} giờ, ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút, ${secs} giây`;
    } else {
      return `${secs} giây`;
    }
  };

  // Lấy danh sách cầu thủ
  const getPlayers = async (contract) => {
    try {
      if (!contract) return;
      
      const playerCountData = await contract.playerCount();
      const playerCount = Number(playerCountData);
      
      const playersData = [];
      for (let i = 0; i < playerCount; i++) {
        const player = await contract.getPlayer(i);
        playersData.push({
          id: i,
          name: player[0],
          team: player[1],
          votes: Number(player[2])
        });
      }
      
      setPlayers(playersData);
    } catch (error) {
      console.error("Lỗi lấy danh sách cầu thủ:", error);
      setError('Không thể lấy danh sách cầu thủ. Vui lòng thử lại sau.');
    }
  };

  // Bỏ phiếu
  const voteForPlayer = async (playerId) => {
    try {
      if (!contract) return;
      
      setError('');
      setLoading(true);
      
      const transaction = await contract.vote(playerId);
      await transaction.wait();
      
      setHasUserVoted(true);
      
      // Cập nhật lại danh sách cầu thủ
      await getPlayers(contract);
      
      alert(`Đã bỏ phiếu thành công cho cầu thủ ${players[playerId].name}!`);
    } catch (error) {
      console.error("Lỗi bỏ phiếu:", error);
      if (error.message.includes("Cuộc bỏ phiếu chưa bắt đầu")) {
        setError('Cuộc bỏ phiếu chưa bắt đầu');
      } else if (error.message.includes("Cuộc bỏ phiếu đã kết thúc")) {
        setError('Cuộc bỏ phiếu đã kết thúc');
      } else if (error.message.includes("Bạn đã bỏ phiếu rồi")) {
        setError('Bạn đã bỏ phiếu rồi');
      } else {
        setError('Có lỗi xảy ra khi bỏ phiếu. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật thời gian định kỳ
  useEffect(() => {
    const timer = setInterval(async () => {
      if (contract) {
        await getVotingTimeInfo(contract);
        
        // Nếu cuộc bỏ phiếu đã kết thúc và chưa có thông tin người chiến thắng, lấy dữ liệu
        if (votingTimeInfo.ended && !winner) {
          try {
            const winnerInfo = await contract.getWinner();
            setWinner({
              id: Number(winnerInfo[0]),
              name: winnerInfo[1],
              votes: Number(winnerInfo[2])
            });
          } catch (error) {
            console.log("Không thể lấy thông tin người chiến thắng:", error);
          }
        }
      }
    }, 1000);
  
    return () => clearInterval(timer);
  }, [contract, votingTimeInfo.ended, winner]);

  // Kết nối ví khi trang được tải
  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
      
      // Lắng nghe sự kiện thay đổi tài khoản
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount('');
          setContract(null);
          setPlayers([]);
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-3xl font-bold">Bình chọn Quả Bóng Vàng - Ballon d'Or 2025</h1>
          <p className="mt-2">Cầu thủ bóng đá xuất sắc nhất năm</p>
        </div>

        <div className="p-6">
          {/* Thông tin ví và kết nối */}
          <div className="mb-8">
            {account ? (
              <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                <div>
                  <p className="text-sm text-gray-600">Ví đã kết nối</p>
                  <p className="font-mono text-sm">{account}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Đã kết nối</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition duration-200"
              >
                Kết nối ví MetaMask
              </button>
            )}
          </div>

          {/* Thông tin thời gian */}
          {account && (
            <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Trạng thái cuộc bỏ phiếu</h2>
              <p className="text-gray-700">{votingTimeInfo.timeLeft}</p>
              {votingTimeInfo.startTime && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Bắt đầu: {new Date(votingTimeInfo.startTime * 1000).toLocaleString()}</p>
                  <p>Kết thúc: {new Date(votingTimeInfo.endTime * 1000).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Thông báo lỗi */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Kết quả người chiến thắng */}
          {winner && votingTimeInfo.ended && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <h2 className="text-2xl font-bold text-blue-800 mb-2">🏆 Người chiến thắng 🏆</h2>
              <p className="text-xl font-semibold">{winner.name}</p>
              <p className="text-gray-600">với {winner.votes} phiếu bầu</p>
            </div>
          )}

          {/* Danh sách cầu thủ */}
          {account && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Danh sách cầu thủ</h2>
              
              {loading ? (
                <p className="text-center text-gray-500 py-8">Đang tải dữ liệu...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {players.map((player) => (
                    <div key={player.id} className="border rounded-lg overflow-hidden hover:shadow-md transition duration-200">
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{player.name}</h3>
                        <p className="text-gray-600 text-sm">{player.team}</p>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-sm text-gray-500">{player.votes} phiếu bầu</span>
                          {!hasUserVoted && votingTimeInfo.started && !votingTimeInfo.ended && (
                            <button
                              onClick={() => voteForPlayer(player.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              disabled={loading}
                            >
                              Bỏ phiếu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasUserVoted && (
                <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-center">
                  Bạn đã bỏ phiếu trong cuộc bầu chọn này. Cảm ơn đã tham gia!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;