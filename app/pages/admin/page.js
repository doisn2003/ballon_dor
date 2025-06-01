'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from '../../../styles/Home.module.css';

// ABI của hợp đồng
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
const contractAddress = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";

const Admin = () => {
  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [contract, setContract] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
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
        
        // Khởi tạo contract
        const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(votingContract);

        // Kiểm tra xem người dùng có phải là owner không
        const ownerAddress = await votingContract.owner();
        setIsOwner(accounts[0].toLowerCase() === ownerAddress.toLowerCase());

        // Lấy danh sách cầu thủ
        await getPlayers(votingContract);
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

  // Kết nối ví khi component được mount
  useEffect(() => {
    connectWallet();
  }, []);

  // Lắng nghe sự kiện thay đổi tài khoản
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        connectWallet();
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>Đang tải...</h1>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Trang quản trị Ballon d'Or 2025
        </h1>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        {!account ? (
          <button className={styles.button} onClick={connectWallet}>
            Kết nối ví
          </button>
        ) : (
          <div className={styles.connected}>
            <p>Địa chỉ ví: {account.slice(0, 6)}...{account.slice(-4)}</p>
            {!isOwner && <p className={styles.error}>Bạn không phải là quản trị viên!</p>}
          </div>
        )}
        
        {isOwner && (
          <div className={styles.adminPanel}>
            <h2>Quản lý giải thưởng</h2>
            <div className={styles.playersList}>
              {players.map(player => (
                <div key={player.id} className={styles.playerCard}>
                  <h3>{player.name}</h3>
                  <p>{player.team}</p>
                  <p className={styles.votes}>{player.votes} phiếu</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin; 