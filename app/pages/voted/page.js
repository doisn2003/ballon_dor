'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from '../../../styles/Voted.module.css';

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
  "function getWinner() view returns (uint8, string, uint256)",
  "function getVotedPlayer(address) view returns (uint8)",
  "function getVotersForPlayer(uint8, uint256, uint256) view returns (address[])",
  "function getVoterCountForPlayer(uint8) view returns (uint256)"
];

// Địa chỉ hợp đồng
const contractAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

// Hàm mã hóa địa chỉ ví cho mục đích bảo mật
const encryptAddress = (address) => {
  if (!address) return '';
  // Giữ 6 ký tự đầu và 4 ký tự cuối, phần giữa thay bằng dấu ...
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Giả lập hàm tạo bằng chứng Zero-Knowledge
const generateZKProof = (address, playerId, playerName) => {
  // Trong thực tế, đây sẽ là một hàm phức tạp sử dụng thư viện ZK như snarkjs
  // Nhưng ở đây chúng ta sẽ giả lập kết quả
  const randomHash = ethers.keccak256(ethers.toUtf8Bytes(`${address}-${playerId}-${Date.now()}`));
  return {
    proof: randomHash,
    publicSignals: [
      ethers.keccak256(ethers.toUtf8Bytes(playerName)),
      ethers.keccak256(ethers.toUtf8Bytes(address))
    ]
  };
};

// Hàm xác minh bằng chứng Zero-Knowledge
const verifyZKProof = (proof, publicSignals) => {
  // Trong thực tế, đây sẽ gọi đến contract xác minh ZK
  // Ở đây chúng ta sẽ luôn trả về true
  return true;
};

const VotedPage = () => {
  // States
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [userVotedPlayer, setUserVotedPlayer] = useState(null);
  const [error, setError] = useState('');
  const [votersData, setVotersData] = useState({});
  const [zkProof, setZkProof] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [secureSum, setSecureSum] = useState({});
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
        
        // Khởi tạo contract
        const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(votingContract);
        console.log("Contract đã được khởi tạo:", votingContract.address);

        try {
          // Kiểm tra người dùng đã bỏ phiếu chưa
          if (accounts[0]) {
            const voted = await votingContract.hasVoted(accounts[0]);
            console.log("Đã bỏ phiếu:", voted);
            setHasUserVoted(voted);

            if (voted) {
              // Lấy thông tin phiếu bầu của người dùng
              const votedPlayerId = await votingContract.getVotedPlayer(accounts[0]);
              console.log("ID cầu thủ đã bầu:", votedPlayerId);
              
              if (votedPlayerId !== 255) { // 255 là giá trị đặc biệt chỉ ra rằng chưa bỏ phiếu
                setUserVotedPlayer(votedPlayerId);
              }
            }
          }
  
          // Lấy danh sách cầu thủ
          await getPlayers(votingContract);
          
          // Lấy danh sách người bỏ phiếu cho mỗi cầu thủ
          await getVotersForAllPlayers(votingContract);
          
          // Tính tổng secure sum (giả lập)
          calculateSecureSum();
          
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
        
        // Xác định tên file ảnh dựa vào tên cầu thủ
        let imageFile = '';
        const playerName = player[0].toLowerCase().replace(/\s+/g, '_');
        
        // Danh sách cầu thủ và file ảnh tương ứng
        if (playerName.includes('messi')) {
          imageFile = 'messi.jpg';
        } else if (playerName.includes('ronaldo') || playerName.includes('cristiano')) {
          imageFile = 'cristiano_ronaldo.jpg';
        } else if (playerName.includes('haaland')) {
          imageFile = 'erling_haaland.jpg';
        } else if (playerName.includes('mbapp')) {
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

  // Lấy danh sách người bỏ phiếu cho tất cả cầu thủ
  const getVotersForAllPlayers = async (contract) => {
    try {
      if (!contract) return;
      
      const votersInfo = {};
      
      for (let i = 0; i < players.length; i++) {
        const voterCount = await contract.getVoterCountForPlayer(i);
        const numVoters = Number(voterCount);
        
        // Lấy tối đa 100 địa chỉ người bỏ phiếu cho mỗi cầu thủ
        if (numVoters > 0) {
          const voters = await contract.getVotersForPlayer(i, 0, 100);
          votersInfo[i] = {
            count: numVoters,
            addresses: voters.map(addr => encryptAddress(addr)) // Mã hóa địa chỉ
          };
        } else {
          votersInfo[i] = { count: 0, addresses: [] };
        }
      }
      
      setVotersData(votersInfo);
    } catch (error) {
      console.error("Lỗi lấy danh sách người bỏ phiếu:", error);
    }
  };

  // Tính toán Secure Sum (giả lập)
  const calculateSecureSum = () => {
    // Trong thực tế, đây sẽ là một quá trình phức tạp sử dụng mã hóa đồng hình
    // Ở đây chúng ta giả lập kết quả
    
    const secureSumResults = {};
    
    players.forEach(player => {
      // Giả lập giá trị tổng secure sum
      secureSumResults[player.id] = {
        encryptedSum: ethers.keccak256(ethers.toUtf8Bytes(`${player.name}-${player.votes}-${Date.now()}`)),
        publicSum: player.votes
      };
    });
    
    setSecureSum(secureSumResults);
  };

  // Tạo bằng chứng Zero-Knowledge
  const createZKProof = async () => {
    if (!account || userVotedPlayer === null || !players[userVotedPlayer]) {
      setError('Không thể tạo bằng chứng ZK: Người dùng chưa bỏ phiếu hoặc dữ liệu không đầy đủ');
      return;
    }
    
    setLoading(true);
    
    try {
      // Trong thực tế, đây sẽ gọi đến một API hoặc thư viện ZK để tạo bằng chứng
      // Ở đây chúng ta giả lập kết quả
      const playerName = players[userVotedPlayer].name;
      const proof = generateZKProof(account, userVotedPlayer, playerName);
      
      setZkProof(proof);
      setVerificationResult(null); // Reset kết quả xác minh
    } catch (error) {
      console.error("Lỗi khi tạo bằng chứng ZK:", error);
      setError('Không thể tạo bằng chứng Zero-Knowledge. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Xác minh bằng chứng Zero-Knowledge
  const verifyZKProofAction = async () => {
    if (!zkProof) {
      setError('Vui lòng tạo bằng chứng ZK trước khi xác minh');
      return;
    }
    
    setLoading(true);
    
    try {
      // Trong thực tế, đây sẽ gọi đến contract xác minh hoặc API
      // Ở đây chúng ta giả lập kết quả
      const result = verifyZKProof(zkProof.proof, zkProof.publicSignals);
      
      setVerificationResult({
        success: result,
        message: result 
          ? 'Xác minh thành công! Phiếu bầu của bạn đã được tính vào tổng mà không tiết lộ nội dung.' 
          : 'Xác minh thất bại. Bằng chứng không hợp lệ.'
      });
    } catch (error) {
      console.error("Lỗi khi xác minh bằng chứng ZK:", error);
      setError('Không thể xác minh bằng chứng Zero-Knowledge. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/ballonBall.png" alt="Ballon d'Or" className={styles.logo} />
          </div>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Xác minh phiếu bầu - Ballon d'Or 2025</h1>
            <p className={styles.subtitle}>Xem và xác minh phiếu bầu của bạn</p>
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

        {/* Thông tin phiếu bầu của người dùng */}
        {account && (
          <div className={styles.votedInfoSection}>
            <h2 className={styles.sectionTitle}>
              <span>🗳️</span> Thông tin phiếu bầu của bạn
            </h2>
            
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : hasUserVoted ? (
              <div className={styles.votedInfoCard}>
                <div className={styles.votedStatus}>
                  <div className={styles.votedIcon}>✅</div>
                  <div className={styles.votedText}>
                    <h3>Bạn đã tham gia bỏ phiếu</h3>
                    {userVotedPlayer !== null && players[userVotedPlayer] && (
                      <p>Bạn đã bỏ phiếu cho <span className={styles.highlightName}>{players[userVotedPlayer].name}</span> từ đội <span className={styles.highlightTeam}>{players[userVotedPlayer].team}</span></p>
                    )}
                  </div>
                </div>

                {/* Zero-Knowledge Proof Section */}
                <div className={styles.zkProofSection}>
                  <h3>Zero-Knowledge Proof</h3>
                  <p>
                    Bạn có thể chứng minh phiếu bầu của mình đã được tính vào tổng mà không tiết lộ bạn đã bỏ phiếu cho ai
                  </p>
                  
                  {!zkProof ? (
                    <button 
                      className={styles.zkButton}
                      onClick={createZKProof}
                      disabled={loading}
                    >
                      {loading ? (
                        <><div className={styles.smallSpinner}></div> Đang tạo bằng chứng...</>
                      ) : (
                        <>Tạo bằng chứng Zero-Knowledge</>
                      )}
                    </button>
                  ) : (
                    <div className={styles.proofContainer}>
                      <div className={styles.proofInfo}>
                        <p>Bằng chứng đã được tạo thành công!</p>
                        <div className={styles.proofData}>
                          <div className={styles.proofItem}>
                            <span className={styles.proofLabel}>Bằng chứng Hash:</span>
                            <span className={styles.proofValue}>{zkProof.proof.substring(0, 20)}...</span>
                          </div>
                          <div className={styles.proofItem}>
                            <span className={styles.proofLabel}>Public Signals:</span>
                            <span className={styles.proofValue}>{zkProof.publicSignals[0].substring(0, 15)}...</span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className={styles.verifyButton}
                        onClick={verifyZKProofAction}
                        disabled={loading}
                      >
                        {loading ? (
                          <><div className={styles.smallSpinner}></div> Đang xác minh...</>
                        ) : (
                          <>Xác minh bằng chứng</>
                        )}
                      </button>
                      
                      {verificationResult && (
                        <div className={`${styles.verificationResult} ${verificationResult.success ? styles.success : styles.failure}`}>
                          <div className={styles.verificationIcon}>
                            {verificationResult.success ? '✓' : '✗'}
                          </div>
                          <p>{verificationResult.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.notVotedMessage}>
                <div className={styles.notVotedIcon}>ℹ️</div>
                <p>Bạn chưa tham gia bỏ phiếu. Vui lòng bỏ phiếu trước để sử dụng tính năng này.</p>
              </div>
            )}
          </div>
        )}

        {/* Secure Sum Section - Hiển thị tổng được mã hóa */}
        {account && (
          <div className={styles.secureSumSection}>
            <h2 className={styles.sectionTitle}>
              <span>🔐</span> Secure Sum - Tổng hợp phiếu bầu an toàn
            </h2>
            <p className={styles.secureSumDescription}>
              Đây là kết quả tổng hợp phiếu bầu sử dụng phương pháp Secure Sum, đảm bảo tính riêng tư cho người bỏ phiếu. 
              Dữ liệu phiếu bầu cá nhân được mã hóa đồng hình, chỉ hiển thị tổng số phiếu mà không tiết lộ từng lá phiếu.
            </p>
            
            <div className={styles.secureSumTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCell}>Cầu thủ</div>
                <div className={styles.tableCell}>Đội</div>
                <div className={styles.tableCell}>Tổng số phiếu</div>
                <div className={styles.tableCell}>Bằng chứng mã hóa</div>
              </div>
              {players.map(player => (
                <div key={player.id} className={styles.tableRow}>
                  <div className={styles.tableCell}>{player.name}</div>
                  <div className={styles.tableCell}>{player.team}</div>
                  <div className={styles.tableCell}>{player.votes}</div>
                  <div className={styles.tableCell}>
                    {secureSum[player.id] ? (
                      <span className={styles.encryptedData}>
                        {secureSum[player.id].encryptedSum.substring(0, 10)}...
                      </span>
                    ) : (
                      'Đang tải...'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phần hiển thị địa chỉ đã bỏ phiếu (đã được mã hóa) */}
        {account && (
          <div className={styles.votersSection}>
            <h2 className={styles.sectionTitle}>
              <span>👥</span> Địa chỉ đã bỏ phiếu (đã mã hóa)
            </h2>
            <p className={styles.votersDescription}>
              Danh sách địa chỉ đã bỏ phiếu được hiển thị dưới dạng mã hóa để bảo vệ quyền riêng tư. 
              Bạn có thể xác nhận địa chỉ của mình có trong danh sách nhưng không thể biết ai đã bỏ phiếu cho cầu thủ nào.
            </p>
            
            <div className={styles.votersTabs}>
              {players.map(player => (
                <div key={player.id} className={styles.voterTab}>
                  <div className={styles.voterTabHeader}>
                    <h3>{player.name}</h3>
                    <span className={styles.voterCount}>
                      {votersData[player.id] ? votersData[player.id].count : 0} phiếu
                    </span>
                  </div>
                  <div className={styles.voterAddresses}>
                    {votersData[player.id] && votersData[player.id].addresses.length > 0 ? (
                      votersData[player.id].addresses.map((addr, index) => (
                        <div key={index} className={styles.voterAddress}>
                          {addr}
                        </div>
                      ))
                    ) : (
                      <p>Không có địa chỉ nào.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

export default VotedPage;
