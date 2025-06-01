'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from '../../../styles/Admin.module.css';

// ABI của hợp đồng
const contractABI = [
  "function owner() view returns (address)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function playerCount() view returns (uint8)",
  "function addPlayer(string memory, string memory) public",
  "function hasVoted(address) view returns (bool)",
  "function players(uint8) view returns (string, string, uint256)",
  "function getPlayer(uint8) view returns (string, string, uint256)",
  "function vote(uint8) public",
  "function getWinner() view returns (uint8, string, uint256)"
];

// Thông tin đăng nhập admin
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'abc123';

const Admin = () => {
  // States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [players, setPlayers] = useState([]);
  const [deployStatus, setDeployStatus] = useState({
    isDeployed: false,
    isLoading: false,
    message: ''
  });
  const [newPlayer, setNewPlayer] = useState({ name: '', team: '' });
  const [votingTime, setVotingTime] = useState({
    startTime: new Date(),
    durationInMinutes: 60
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractDeployed, setContractDeployed] = useState(false);
  const [activeTab, setActiveTab] = useState('players');

  // Xử lý đăng nhập
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError('');
      localStorage.setItem('isAdminLoggedIn', 'true');
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác');
    }
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
  };

  // Kiểm tra trạng thái đăng nhập từ localStorage khi trang được tải
  useEffect(() => {
    if (localStorage.getItem('isAdminLoggedIn') === 'true') {
      setIsLoggedIn(true);
    }

    // Kiểm tra xem hợp đồng đã được triển khai chưa
    const checkDeployment = async () => {
      try {
        const response = await fetch('/api/contractStatus');
        if (response.ok) {
          const data = await response.json();
          setContractDeployed(data.isDeployed);
          if (data.address) {
            setContractAddress(data.address);
          }
        }
      } catch (error) {
        console.error("Lỗi kiểm tra trạng thái triển khai:", error);
      }
    };

    checkDeployment();
  }, []);

  // Kết nối với MetaMask
  const connectWallet = async () => {
    try {
      setError('');
      setLoading(true);
      
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        
        if (contractAddress) {
          // Khởi tạo contract nếu đã có địa chỉ
          const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
          setContract(votingContract);

          // Kiểm tra xem người dùng có phải là owner không
          try {
            const ownerAddress = await votingContract.owner();
            setIsOwner(accounts[0].toLowerCase() === ownerAddress.toLowerCase());
            
            // Lấy danh sách cầu thủ nếu là owner
            if (accounts[0].toLowerCase() === ownerAddress.toLowerCase()) {
              await getPlayers(votingContract);
            }
          } catch (error) {
            console.error("Lỗi khi kiểm tra owner:", error);
            setIsOwner(false);
          }
        } else {
          console.log("Chưa có địa chỉ hợp đồng");
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

  // Lấy danh sách cầu thủ
  const getPlayers = async (contractInstance) => {
    try {
      if (!contractInstance) return;
      
      const playerCountData = await contractInstance.playerCount();
      const playerCount = Number(playerCountData);
      
      const playersData = [];
      for (let i = 0; i < playerCount; i++) {
        const player = await contractInstance.getPlayer(i);
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

  // Xử lý thêm cầu thủ mới
  const handleAddPlayer = async () => {
    try {
      if (!contract || !isOwner) return;
      
      setLoading(true);
      setError('');
      
      // Validate thông tin
      if (!newPlayer.name || !newPlayer.team) {
        setError('Vui lòng điền đầy đủ thông tin cầu thủ');
        setLoading(false);
        return;
      }
      
      // Thêm cầu thủ mới vào contract
      const transaction = await contract.addPlayer(newPlayer.name, newPlayer.team);
      await transaction.wait();
      
      // Cập nhật lại danh sách cầu thủ
      await getPlayers(contract);
      
      // Reset form
      setNewPlayer({ name: '', team: '' });
      
      alert(`Đã thêm cầu thủ ${newPlayer.name} thành công!`);
    } catch (error) {
      console.error("Lỗi thêm cầu thủ:", error);
      setError('Không thể thêm cầu thủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý triển khai hợp đồng
  const deployContract = async () => {
    try {
      setDeployStatus({
        isLoading: true,
        isDeployed: false,
        message: 'Đang triển khai hợp đồng...'
      });

      // Chuẩn bị tham số
      const startTimestamp = Math.floor(votingTime.startTime.getTime() / 1000);
      const durationInMinutes = votingTime.durationInMinutes;
      
      // Gửi yêu cầu triển khai lên server
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startTime: startTimestamp,
          durationInMinutes,
          players: players.map(p => ({ name: p.name, team: p.team }))
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDeployStatus({
          isLoading: false,
          isDeployed: true,
          message: `Triển khai thành công! Địa chỉ hợp đồng: ${data.contractAddress}`
        });
        
        setContractAddress(data.contractAddress);
        setContractDeployed(true);
        
        // Kết nối lại với hợp đồng mới
        if (account) {
          connectWallet();
        }
      } else {
        throw new Error(data.message || 'Có lỗi xảy ra khi triển khai hợp đồng');
      }
    } catch (error) {
      console.error("Lỗi triển khai hợp đồng:", error);
      setDeployStatus({
        isLoading: false,
        isDeployed: false,
        message: `Lỗi: ${error.message}`
      });
    }
  };

  // Lắng nghe sự kiện thay đổi tài khoản
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount('');
          setContract(null);
          setPlayers([]);
          setIsOwner(false);
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      return () => {
        window.ethereum.removeAllListeners();
      };
    }
  }, []);

  // Trang đăng nhập
  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h2>Đăng nhập quản trị</h2>
          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label>Tài khoản:</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Mật khẩu:</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && <div className={styles.error}>{loginError}</div>}
            <button type="submit" className={styles.loginButton}>Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Trang quản trị Ballon d'Or 2025</h1>
        <div className={styles.userInfo}>
          <span>Xin chào, Admin</span>
          <button onClick={handleLogout} className={styles.logoutButton}>Đăng xuất</button>
        </div>
      </header>

      <div className={styles.metamaskConnect}>
        {!account ? (
          <button onClick={connectWallet} className={styles.connectButton} disabled={loading}>
            {loading ? 'Đang kết nối...' : 'Kết nối ví MetaMask'}
          </button>
        ) : (
          <div className={styles.accountInfo}>
            <div>Đã kết nối với ví: {account.substring(0, 6)}...{account.substring(account.length - 4)}</div>
            {isOwner ? (
              <div className={styles.ownerBadge}>Owner</div>
            ) : (
              <div className={styles.notOwner}>Không phải là owner của hợp đồng</div>
            )}
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isOwner && (
        <div className={styles.adminPanel}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'players' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('players')}
            >
              Quản lý cầu thủ
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'voting' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              Thiết lập bỏ phiếu
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'deploy' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('deploy')}
            >
              Triển khai
            </button>
          </div>

          {activeTab === 'players' && (
            <div className={styles.tabContent}>
              <h2>Quản lý danh sách cầu thủ</h2>
              
              {contractAddress && (
                <div className={styles.addPlayerForm}>
                  <h3>Thêm cầu thủ mới</h3>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      placeholder="Tên cầu thủ"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Đội bóng"
                      value={newPlayer.team}
                      onChange={(e) => setNewPlayer({...newPlayer, team: e.target.value})}
                    />
                    <button 
                      onClick={handleAddPlayer}
                      disabled={loading || !newPlayer.name || !newPlayer.team}
                    >
                      {loading ? 'Đang xử lý...' : 'Thêm cầu thủ'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className={styles.playersList}>
                <h3>Danh sách cầu thủ hiện tại ({players.length})</h3>
                {players.length > 0 ? (
                  <table className={styles.playersTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên cầu thủ</th>
                        <th>Đội bóng</th>
                        <th>Số phiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(player => (
                        <tr key={player.id}>
                          <td>{player.id}</td>
                          <td>{player.name}</td>
                          <td>{player.team}</td>
                          <td>{player.votes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Chưa có cầu thủ nào trong danh sách.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'voting' && (
            <div className={styles.tabContent}>
              <h2>Thiết lập thời gian bỏ phiếu</h2>
              <div className={styles.votingTimeForm}>
                <div className={styles.formGroup}>
                  <label>Thời gian bắt đầu:</label>
                  <input
                    type="datetime-local"
                    value={votingTime.startTime.toISOString().slice(0, 16)}
                    onChange={(e) => setVotingTime({
                      ...votingTime,
                      startTime: new Date(e.target.value)
                    })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Thời gian diễn ra (phút):</label>
                  <input
                    type="number"
                    min="1"
                    value={votingTime.durationInMinutes}
                    onChange={(e) => setVotingTime({
                      ...votingTime,
                      durationInMinutes: parseInt(e.target.value) || 60
                    })}
                  />
                </div>
                <p className={styles.timePreview}>
                  Cuộc bỏ phiếu sẽ diễn ra từ{' '}
                  <strong>{votingTime.startTime.toLocaleString()}</strong> đến{' '}
                  <strong>
                    {new Date(votingTime.startTime.getTime() + votingTime.durationInMinutes * 60000).toLocaleString()}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className={styles.tabContent}>
              <h2>Triển khai cuộc bỏ phiếu</h2>
              
              {contractDeployed ? (
                <div className={styles.deployedInfo}>
                  <p className={styles.successMessage}>
                    Hợp đồng đã được triển khai thành công!
                  </p>
                  <p>Địa chỉ hợp đồng: <strong>{contractAddress}</strong></p>
                  <p>
                    Thời gian bỏ phiếu: {votingTime.startTime.toLocaleString()} - {' '}
                    {new Date(votingTime.startTime.getTime() + votingTime.durationInMinutes * 60000).toLocaleString()}
                  </p>
                  <p>Số lượng cầu thủ: <strong>{players.length}</strong></p>
                </div>
              ) : (
                <div className={styles.deploySection}>
                  <p className={styles.deployNote}>
                    Khi bạn bấm nút "Bắt đầu tổ chức", hệ thống sẽ triển khai hợp đồng thông minh với các thông tin sau:
                  </p>
                  <ul className={styles.deployInfo}>
                    <li>Thời gian bắt đầu: <strong>{votingTime.startTime.toLocaleString()}</strong></li>
                    <li>Thời gian diễn ra: <strong>{votingTime.durationInMinutes} phút</strong></li>
                    <li>Cầu thủ: <strong>Danh sách đã cấu hình trong tab "Quản lý cầu thủ" (sẽ tự động thêm)</strong></li>
                  </ul>
                  
                  <button
                    className={styles.deployButton}
                    onClick={deployContract}
                    disabled={deployStatus.isLoading}
                  >
                    {deployStatus.isLoading ? 'Đang triển khai...' : 'Bắt đầu tổ chức bỏ phiếu Quả bóng vàng 2025'}
                  </button>
                  
                  {deployStatus.message && (
                    <div className={`${styles.deployMessage} ${deployStatus.isDeployed ? styles.success : styles.error}`}>
                      {deployStatus.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin; 