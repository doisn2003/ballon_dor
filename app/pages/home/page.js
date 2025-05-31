'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from '../../../styles/Home.module.css';

// ABI của contract
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
  const [networkId, setNetworkId] = useState(null);

  // Kết nối với MetaMask
  const connectWallet = async () => {
    try {
      setError('');
      if (window.ethereum) {
        // Kiểm tra xem đã kết nối với mạng Hardhat (localhost:8545) chưa
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setNetworkId(parseInt(chainId, 16).toString());
        
        if (parseInt(chainId, 16) !== 31337) {
          // Yêu cầu người dùng chuyển sang mạng Hardhat
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7A69' }], // 31337 in hex
            });
          } catch (switchError) {
            // Mạng chưa được thêm vào Metamask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x7A69',
                      chainName: 'Hardhat Local',
                      rpcUrls: ['http://127.0.0.1:8545/'],
                      nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                    },
                  ],
                });
              } catch (addError) {
                console.error("Không thể thêm mạng Hardhat", addError);
                setError('Không thể kết nối với mạng Hardhat. Vui lòng thêm mạng thủ công.');
                return;
              }
            } else {
              console.error("Không thể chuyển mạng", switchError);
              setError('Không thể chuyển sang mạng Hardhat. Vui lòng thử lại.');
              return;
            }
          }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(provider);
        
        console.log("Đã kết nối với tài khoản:", accounts[0]);
        console.log("Provider:", provider);
        
        // Khởi tạo contract
        const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(votingContract);
        console.log("Contract đã được khởi tạo:", votingContract.address);

        try {
          // Kiểm tra xem contract có hoạt động không
          const ownerAddress = await votingContract.owner();
          console.log("Chủ sở hữu hợp đồng:", ownerAddress);
          
          // Kiểm tra người dùng đã bỏ phiếu chưa
          if (accounts[0]) {
            const voted = await votingContract.hasVoted(accounts[0]);
            console.log("Đã bỏ phiếu:", voted);
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
        } catch (error) {
          console.error("Lỗi khi tương tác với contract:", error);
          setError('Không thể kết nối với hợp đồng. Hãy đảm bảo Hardhat đang chạy và hợp đồng đã được triển khai.');
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
      
      console.log("Start time:", startTimeData.toString());
      console.log("End time:", endTimeData.toString());
      
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
      
      console.log("Số lượng cầu thủ:", playerCount);
      
      const playersData = [];
      for (let i = 0; i < playerCount; i++) {
        const player = await contract.getPlayer(i);
        
        console.log(`Cầu thủ ${i}:`, player);
        
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
      
      console.log(`Đang bỏ phiếu cho cầu thủ ID ${playerId}`);
      
      const transaction = await contract.vote(playerId);
      console.log("Giao dịch đã gửi:", transaction.hash);
      
      await transaction.wait();
      console.log("Giao dịch đã được xác nhận");
      
      setHasUserVoted(true);
      
      // Cập nhật lại danh sách cầu thủ
      await getPlayers(contract);
      
      alert(`Đã bỏ phiếu thành công cho cầu thủ ${players[playerId].name}!`);
    } catch (error) {
      console.error("Lỗi bỏ phiếu:", error);
      if (error.message.includes("Cuoc bo phieu chua bat dau")) {
        setError('Cuộc bỏ phiếu chưa bắt đầu');
      } else if (error.message.includes("Cuoc bo phieu da ket thuc")) {
        setError('Cuộc bỏ phiếu đã kết thúc');
      } else if (error.message.includes("Ban da bo phieu roi")) {
        setError('Bạn đã bỏ phiếu rồi');
      } else {
        setError('Có lỗi xảy ra khi bỏ phiếu. Vui lòng thử lại sau. ' + error.message);
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

      // Lắng nghe sự kiện thay đổi mạng
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return () => {
        // Xóa các event listener khi component unmount
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      };
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/ballonBall.png" alt="Ballon d'Or" className={styles.logo} />
          </div>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Bình chọn Quả Bóng Vàng - Ballon d'Or 2025</h1>
            <p className={styles.subtitle}>Cầu thủ bóng đá xuất sắc nhất năm</p>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        {/* Network info */}
        {networkId && (
          <div className={networkId === "31337" ? styles.networkSuccess : styles.networkError}>
            <span>Mạng hiện tại: {networkId === "31337" ? "Hardhat Local (31337)" : `${networkId} (Không phải Hardhat)`}</span>
            {networkId !== "31337" && (
              <button onClick={connectWallet} className={styles.switchNetworkButton}>
                Chuyển sang mạng Hardhat
              </button>
            )}
          </div>
        )}

        {/* Thông tin ví và kết nối */}
        <div className={styles.walletSection}>
          {account ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div className={styles.walletIcon}>💼</div>
                <div>
                  <p>Ví đã kết nối</p>
                  <p className={styles.walletAddress}>{account}</p>
                </div>
              </div>
              <div className={styles.statusBadge}>
                <span className={styles.statusDot}></span>
                Đã kết nối
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className={styles.connectButton}
            >
              <span>🦊</span> Kết nối ví MetaMask
            </button>
          )}
        </div>

        {/* Thông tin thời gian */}
        {account && (
          <div className={styles.timerSection}>
            <h2 className={styles.sectionTitle}>
              <span>⏱️</span> Trạng thái cuộc bỏ phiếu
            </h2>
            <div className={styles.timerDisplay}>
              <div className={styles.timerIcon}>⏳</div>
              <div className={styles.timerText}>{votingTimeInfo.timeLeft}</div>
            </div>
            {votingTimeInfo.startTime && (
              <div className={styles.timeDetails}>
                <div className={styles.timeItem}>
                  <span>🕒</span>
                  <span>
                    {isMounted 
                      ? `Bắt đầu: ${new Date(votingTimeInfo.startTime * 1000).toLocaleString()}` 
                      : 'Đang tải...'}
                  </span>
                </div>
                <div className={styles.timeItem}>
                  <span>🏁</span>
                  <span>
                    {isMounted 
                      ? `Kết thúc: ${new Date(votingTimeInfo.endTime * 1000).toLocaleString()}` 
                      : 'Đang tải...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thông báo lỗi */}
        {error && (
          <div className={styles.errorMessage}>
            <div className={styles.errorIcon}>⚠️</div>
            <div>
              <div>{error}</div>
              <div className={styles.errorHelp}>
                Vui lòng kiểm tra lại kết nối MetaMask và thử lại.
              </div>
              <button 
                onClick={() => setError('')}
                className={styles.errorButton}
              >
                <span>✖️</span> Đóng
              </button>
            </div>
          </div>
        )}

        {/* Kết quả người chiến thắng */}
        {winner && votingTimeInfo.ended && (
          <div className={styles.winnerSection}>
            <div className={styles.winnerContent}>
              <div className={styles.winnerHeader}>
                <img src="/trophy.png" alt="Trophy" className={styles.trophyIcon} />
                <h2 className={styles.winnerTitle}>Người chiến thắng</h2>
              </div>
              <div className={styles.winnerCard}>
                <div className={styles.winnerImageContainer}>
                  <img 
                    src={winner && players[winner.id]?.imageFile ? `/images/players/${players[winner.id].imageFile}` : '/images/player-placeholder.jpg'} 
                    alt={winner?.name} 
                    className={styles.winnerImage} 
                    onError={(e) => {e.target.onerror = null; e.target.src = '/images/player-placeholder.jpg'}} 
                  />
                </div>
                <div className={styles.winnerInfo}>
                  <h3 className={styles.winnerName}>{winner.name}</h3>
                  <p className={styles.winnerTeam}>
                    {players[winner.id]?.team || ""}
                  </p>
                  <div className={styles.winnerVotes}>
                    <span>🏆</span> {winner.votes} phiếu bầu
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách cầu thủ */}
        {account && (
          <div className={styles.playersSection}>
            <h2 className={styles.sectionTitle}>
              <span>⚽</span> Danh sách cầu thủ
            </h2>
            
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : players.length > 0 ? (
              <div className={styles.playersGrid}>
                {players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`${styles.playerCard} ${player.name.toLowerCase().includes('kane') ? styles.centerCard : ''}`}
                  >
                    <div className={styles.playerImageContainer}>
                      <img 
                        src={player.imageFile ? `/images/players/${player.imageFile}` : '/images/player-placeholder.jpg'} 
                        alt={player.name}
                        className={styles.playerImage} 
                        onError={(e) => {e.target.onerror = null; e.target.src = '/images/player-placeholder.jpg'}}
                      />
                      <div className={styles.teamBadge}>{player.team}</div>
                    </div>
                    <div className={styles.playerDetails}>
                      <h3 className={styles.playerName}>{player.name}</h3>
                      <div className={styles.playerStats}>
                        <div className={styles.voteCount}>
                          <span>🗳️</span> {player.votes} phiếu
                        </div>
                        {!hasUserVoted && votingTimeInfo.started && !votingTimeInfo.ended && (
                          <button
                            onClick={() => voteForPlayer(player.id)}
                            className={styles.voteButton}
                            disabled={loading}
                          >
                            <span>✓</span> Bỏ phiếu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noPlayers}>
                <p>Không có cầu thủ nào trong danh sách. Vui lòng chờ admin thêm cầu thủ.</p>
              </div>
            )}

            {hasUserVoted && (
              <div className={styles.votedMessage}>
                <span>✅</span> Bạn đã bỏ phiếu trong cuộc bầu chọn này. Cảm ơn đã tham gia!
              </div>
            )}
            
            {votingTimeInfo.started && !votingTimeInfo.ended && (
              <div className={styles.resultButtonContainer}>
                <button 
                  className={styles.resultButton}
                  disabled={!votingTimeInfo.ended}
                >
                  {votingTimeInfo.ended ? (
                    <>Xem kết quả</>
                  ) : (
                    <>
                      <div className={styles.smallSpinner}></div>
                      Chờ kết quả
                    </>
                  )}
                </button>
                <p className={styles.resultNote}>Kết quả sẽ được công bố sau khi cuộc bỏ phiếu kết thúc</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2025 Ballon d'Or Voting dApp | Powered by Ethereum</p>
          <p>Được phát triển với ❤️ Hardhat testnet</p>
        </div>
      </div>
    </div>
  );
};

export default Home; 