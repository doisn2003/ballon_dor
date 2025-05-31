'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';

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
const contractAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

const Home = () => {
  const router = useRouter();
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
  const [isMounted, setIsMounted] = useState(false);

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
        
        // Xác định tên file ảnh dựa vào tên cầu thủ
        let imageFile = '';
        const playerName = player[0].toLowerCase().replace(/\s+/g, '_');
        
        // In ra tên để debug
        console.log("Tên cầu thủ:", player[0], "Tên đã xử lý:", playerName);
        
        // Danh sách cầu thủ và file ảnh tương ứng
        if (playerName.includes('messi')) {
          imageFile = 'messi.jpg';
        } else if (playerName.includes('ronaldo') || playerName.includes('cristiano')) {
          imageFile = 'cristiano_ronaldo.jpg';
        } else if (playerName.includes('haaland')) {
          imageFile = 'erling_haaland.jpg';
        } else if (playerName.includes('mbapp')) { // Sửa để bắt được cả Mbappe và Mbappé
          imageFile = 'kylian_mbappe.jpg';
        } else if (playerName.includes('salah')) {
          imageFile = 'mohamed_salah.jpg';
        } else if (playerName.includes('vinicius') || playerName.includes('vinícius') || playerName.includes('junior') || playerName.includes('júnior')) {
          imageFile = 'vinicius.jpg';
        } else if (playerName.includes('lewandowski')) {
          imageFile = 'lewandowski.jpg';
        } else if (playerName.includes('bruyne')) {
          imageFile = 'kevin_de_bruyne.jpg';
        } else if (playerName.includes('kane')) {
          imageFile = 'harry_kane.jpg';
        } else if (playerName.includes('bellingham')) {
          imageFile = 'jude_bellingham.jpg';
        }
        
        console.log("File ảnh được chọn:", imageFile);
        
        playersData.push({
          id: i,
          name: player[0],
          team: player[1],
          votes: Number(player[2]),
          imageFile: imageFile
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Tự động điều hướng đến trang home
    router.push('/pages/home');
  }, [router]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Đang chuyển hướng...</h1>
      </main>
    </div>
  );
};

export default Home;