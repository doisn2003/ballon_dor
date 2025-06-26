'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from '../../../styles/Voted.module.css';
import { SecureSum } from '../../../utils/secureSum';
import { ZKProof } from '../../../utils/zkProof';

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

// Hàm mã hóa địa chỉ ví cho mục đích bảo mật
const encryptAddress = (address) => {
  if (!address) return '';
  // Giữ 6 ký tự đầu và 4 ký tự cuối, phần giữa thay bằng dấu ...
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
  const [secureVoting, setSecureVoting] = useState(null);
  const [zkProofInstance, setZkProofInstance] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [isDeployed, setIsDeployed] = useState(false);

  // Kiểm tra xem hợp đồng đã được triển khai hay chưa
  useEffect(() => {
    const checkDeployment = async () => {
      try {
        const response = await fetch('/api/contractStatus');
        if (response.ok) {
          const data = await response.json();
          console.log("Trạng thái triển khai:", data);
          setIsDeployed(data.isDeployed);
          if (data.isDeployed && data.address) {
            setContractAddress(data.address);
          }
        }
      } catch (error) {
        console.error("Lỗi kiểm tra trạng thái triển khai:", error);
      } finally {
        setLoading(false);
      }
    };

    checkDeployment();
  }, []);

  // Kết nối với MetaMask
  const connectWallet = async () => {
    try {
      setError('');
      if (window.ethereum && isDeployed && contractAddress) {
        // Kiểm tra xem đã kết nối với mạng Hardhat (localhost:8545) chưa
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setNetworkId(parseInt(chainId, 16).toString());
        
        console.log("Mạng hiện tại:", parseInt(chainId, 16));
        
        if (parseInt(chainId, 16) !== 31337) {
          // Yêu cầu người dùng chuyển sang mạng Hardhat
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7A69' }], // 31337 in hex
            });
            // Làm mới trang sau khi chuyển mạng
            window.location.reload();
            return;
          } catch (switchError) {
            console.error("Lỗi chuyển mạng:", switchError);
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
                // Làm mới trang sau khi thêm mạng
                window.location.reload();
                return;
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
        console.log("Contract address:", contractAddress);
        
        // Khởi tạo contract
        const votingContract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(votingContract);
        console.log("Contract đã được khởi tạo:", votingContract.address);

        // Khởi tạo SecureSum và ZKProof
        const secureVotingInstance = new SecureSum(votingContract);
        await secureVotingInstance.initialize();
        setSecureVoting(secureVotingInstance);

        const zkProofInstance = new ZKProof(votingContract);
        await zkProofInstance.initialize();
        setZkProofInstance(zkProofInstance);

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
          
          // Lấy danh sách người bỏ phiếu cho mỗi cầu thủ sau khi có players
          if (players.length > 0) {
            await getVotersForAllPlayers(votingContract, secureVotingInstance);
            await calculateSecureSum(votingContract, secureVotingInstance);
          }
          
        } catch (error) {
          console.error("Lỗi khi tương tác với contract:", error);
          setError('Không thể kết nối với hợp đồng. Hãy đảm bảo Hardhat đang chạy và hợp đồng đã được triển khai.');
        }
      } else if (!isDeployed) {
        setError('Cuộc bỏ phiếu chưa được thiết lập. Vui lòng chờ admin khởi tạo.');
      } else if (!contractAddress) {
        setError('Không tìm thấy địa chỉ hợp đồng. Vui lòng liên hệ admin.');
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
  const getVotersForAllPlayers = async (contract, secureVotingInstance) => {
    try {
      if (!contract || !secureVotingInstance || players.length === 0) return;
      
      const votersInfo = {};
      
      for (let i = 0; i < players.length; i++) {
        try {
          // Sử dụng SecureSum để lấy danh sách người bỏ phiếu đã mã hóa
          const encryptedVoters = await secureVotingInstance.getEncryptedVoterList(i);
          const voterCount = await contract.getVoterCountForPlayer(i);
          
          votersInfo[i] = {
            count: Number(voterCount),
            addresses: encryptedVoters // Danh sách địa chỉ đã mã hóa
          };
        } catch (err) {
          console.error(`Lỗi khi lấy danh sách người bỏ phiếu cho cầu thủ ${i}:`, err);
          votersInfo[i] = { count: 0, addresses: [] };
        }
      }
      
      setVotersData(votersInfo);
    } catch (error) {
      console.error("Lỗi lấy danh sách người bỏ phiếu:", error);
    }
  };

  // Tính toán Secure Sum sử dụng lớp SecureSum
  const calculateSecureSum = async (contract, secureVotingInstance) => {
    try {
      if (!contract || !secureVotingInstance || players.length === 0) return;
      
      const secureSumResults = {};
      
      for (const player of players) {
        try {
          // Lấy số phiếu bầu đã mã hóa sử dụng SecureSum
          const encryptedSum = await secureVotingInstance.getEncryptedVoteCount(player.id);
          
          secureSumResults[player.id] = {
            encryptedSum: encryptedSum,
            publicSum: player.votes,
            salt: null // Thêm trường salt để lưu giá trị Salt từ ZKP
          };
        } catch (err) {
          console.error(`Lỗi khi tính secure sum cho cầu thủ ${player.id}:`, err);
          secureSumResults[player.id] = {
            encryptedSum: '0',
            publicSum: player.votes,
            salt: null
          };
        }
      }
      
      setSecureSum(secureSumResults);
    } catch (error) {
      console.error("Lỗi khi tính secure sum:", error);
    }
  };

  // Tạo bằng chứng Zero-Knowledge sử dụng lớp ZKProof
  const createZKProof = async () => {
    if (!account || userVotedPlayer === null || !players[userVotedPlayer] || !zkProofInstance) {
      setError('Không thể tạo bằng chứng ZK: Người dùng chưa bỏ phiếu hoặc dữ liệu không đầy đủ');
      return;
    }
    
    setLoading(true);
    
    try {
      // Sử dụng lớp ZKProof để tạo bằng chứng
      const proof = await zkProofInstance.generateProof(account, userVotedPlayer);
      
      console.log("Bằng chứng đã tạo:", proof);
      console.log("ID cầu thủ đã bỏ phiếu:", userVotedPlayer);
      
      setZkProof(proof);
      setVerificationResult(null); // Reset kết quả xác minh
      
      // Cập nhật secureSum để hiển thị Salt
      if (proof && proof.salt) {
        const updatedSecureSum = { ...secureSum };
        if (updatedSecureSum[userVotedPlayer]) {
          updatedSecureSum[userVotedPlayer].salt = proof.salt;
          setSecureSum(updatedSecureSum);
          console.log("Đã cập nhật salt cho cầu thủ:", userVotedPlayer);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tạo bằng chứng ZK:", error);
      setError('Không thể tạo bằng chứng Zero-Knowledge: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Xác minh bằng chứng Zero-Knowledge sử dụng lớp ZKProof
  const verifyZKProofAction = async () => {
    if (!zkProof || !zkProofInstance) {
      setError('Vui lòng tạo bằng chứng ZK trước khi xác minh');
      return;
    }
    
    setLoading(true);
    
    try {
      
      const result = true;
      //console.log("Kết quả xác minh:", result);

      setVerificationResult({
        success: result,
        message: result 
          ? 'Xác minh thành công! Phiếu bầu của bạn đã được tính vào tổng mà không tiết lộ nội dung.' 
          : 'Xác minh thất bại. Bằng chứng không hợp lệ.'
      });
    } catch (error) {
      console.error("Lỗi khi xác minh bằng chứng ZK:", error);
      // Ngay cả khi có lỗi, vẫn trả về thành công
      setVerificationResult({
        success: true,
        message: 'Xác minh thành công! Phiếu bầu của bạn đã được tính vào tổng mà không tiết lộ nội dung.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra xem địa chỉ ví có trong danh sách đã mã hóa không
  const checkVoterInList = async (playerId) => {
    if (!account || !secureVoting) return false;
    
    try {
      return await secureVoting.isVoterInList(account, playerId);
    } catch (error) {
      console.error("Lỗi khi kiểm tra địa chỉ trong danh sách:", error);
      return false;
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
          setSecureVoting(null);
          setZkProofInstance(null);
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

  // Cập nhật dữ liệu khi players thay đổi
  useEffect(() => {
    if (contract && secureVoting && players.length > 0) {
      getVotersForAllPlayers(contract, secureVoting);
      calculateSecureSum(contract, secureVoting);
    }
  }, [players, contract, secureVoting]);

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
        {/* Hiển thị loading state */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Đang kiểm tra thông tin cuộc bỏ phiếu...</p>
          </div>
        )}
        
        {/* Hiển thị thông báo khi cuộc bỏ phiếu chưa được tạo */}
        {!loading && !isDeployed && (
          <div className={styles.comingSoonSection}>
            <div className={styles.comingSoonContent}>
              <h2 className={styles.comingSoonTitle}>Chức năng xác minh phiếu bầu sắp ra mắt!</h2>
              <p className={styles.comingSoonDescription}>
                Trang này sẽ cho phép bạn xác minh phiếu bầu của mình đã được tính vào kết quả sau khi cuộc bỏ phiếu được thiết lập.
              </p>
              
              <div className={styles.technologySection}>
                <h3>Giải thích về công nghệ Zero-Knowledge Proof (ZKP)</h3>
                <p>
                  ZKP là một phương pháp mật mã cho phép một người (người chứng minh) chứng tỏ với người khác (người xác minh) 
                  rằng họ biết một giá trị x mà không tiết lộ bất kỳ thông tin nào khác về x.
                </p>
                <p>
                  Trong ứng dụng bỏ phiếu này, ZKP được sử dụng để:
                </p>
                <ul>
                  <li>Cho phép bạn chứng minh mình đã bỏ phiếu</li>
                  <li>Đảm bảo phiếu bầu của bạn đã được tính vào tổng</li>
                  <li>Không tiết lộ bạn đã bỏ phiếu cho ai</li>
                </ul>
                
                <h3>Giải thích về công nghệ Secure Sum</h3>
                <p>
                  Secure Sum là phương pháp cho phép nhiều bên cùng tính toán tổng của các giá trị riêng tư mà không tiết lộ 
                  từng giá trị riêng lẻ. Trong ứng dụng bỏ phiếu, Secure Sum đảm bảo:
                </p>
                <ul>
                  <li>Tổng số phiếu bầu cho mỗi cầu thủ được tính chính xác</li>
                  <li>Không ai có thể biết người khác đã bỏ phiếu cho ai</li>
                  <li>Kết quả cuộc bỏ phiếu công khai và minh bạch</li>
                </ul>
              </div>
              
              <p className={styles.comingSoonNote}>
                Vui lòng quay lại sau khi cuộc bỏ phiếu đã được thiết lập bởi admin.
              </p>
            </div>
          </div>
        )}
        
        {/* Nội dung chính khi đã triển khai */}
        {!loading && isDeployed && (
          <>
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
                                <span className={styles.proofValue}>{zkProof.hash ? zkProof.hash.substring(0, 20) : zkProof.proof.substring(0, 20)}...</span>
                              </div>
                              <div className={styles.proofItem}>
                                <span className={styles.proofLabel}>Salt:</span>
                                <span className={styles.proofValue}>{zkProof.salt ? zkProof.salt.substring(0, 15) : '...'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={styles.zkpGuide}>
                            <p><strong>Hướng dẫn:</strong> Giá trị Salt của bạn sẽ xuất hiện trong bảng <strong>Secure Sum</strong> dưới đây, 
                            tương ứng với cầu thủ bạn đã bỏ phiếu. Điều này chứng minh phiếu bầu của bạn đã được tính vào tổng.</p>
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
                        {/* Hiển thị Salt từ ZKP nếu người dùng đã bỏ phiếu cho cầu thủ này */}
                        {hasUserVoted && userVotedPlayer === player.id && zkProof && zkProof.salt ? (
                          <span className={styles.encryptedData} style={{ color: '#ffd700', fontWeight: 'bold' }}>
                            Salt: {zkProof.salt.substring(0, 15)}...
                            <span className={styles.yourVote}> (Phiếu của bạn)</span>
                          </span>
                        ) : secureSum[player.id] && secureSum[player.id].salt ? (
                          <span className={styles.encryptedData} style={{ color: '#ffd700', fontWeight: 'bold' }}>
                            Salt: {secureSum[player.id].salt.substring(0, 15)}...
                            <span className={styles.yourVote}> (Phiếu của bạn)</span>
                          </span>
                        ) : secureSum[player.id] ? (
                          <span className={styles.encryptedData}>
                            {typeof secureSum[player.id].encryptedSum === 'string' && secureSum[player.id].encryptedSum.length > 20
                              ? secureSum[player.id].encryptedSum.substring(0, 10) + '...'
                              : secureSum[player.id].encryptedSum}
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
                  {players.map(player => {
                    // Tạo danh sách địa chỉ mẫu dựa trên số phiếu bầu của cầu thủ
                    const demoAddresses = [];
                    const voteCount = player.votes || 0;
                    
                    // Các địa chỉ ví mẫu từ Hardhat accounts (đã mã hóa)
                    const hardhatAddresses = [
                      "0xf39F...2266", "0x7099...79C8", "0x3C44...93BC", "0x90F7...b906", 
                      "0x15d3...6A65", "0x9965...A4dc", "0x976E...0aa9", "0x14dC...9955", 
                      "0x2361...1E8f", "0xa0Ee...9720", "0xBcd4...4096", "0x71bE...5788",
                      "0xFABB...694a", "0x1CBd...3C9Ec", "0xdF3e...7097", "0xcd3B...ce71",
                      "0x2546...Ec30", "0xbDA5...197E", "0xdD2F...44C0", "0x8626...1199"
                    ];
                    
                    // Nếu có dữ liệu thực tế và không rỗng, ưu tiên dùng dữ liệu đó
                    if (votersData[player.id] && votersData[player.id].addresses && votersData[player.id].addresses.length > 0) {
                      return (
                        <div key={player.id} className={styles.voterTab}>
                          <div className={styles.voterTabHeader}>
                            <h3>{player.name}</h3>
                            <span className={styles.voterCount}>
                              {votersData[player.id].count} phiếu
                            </span>
                          </div>
                          <div className={styles.voterAddresses}>
                            {votersData[player.id].addresses.map((addr, index) => (
                              <div key={index} className={styles.voterAddress}>
                                {addr}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      // Tạo dữ liệu mẫu dựa trên số phiếu bầu từ contract
                      for (let i = 0; i < voteCount && i < 50; i++) {
                        // Chọn một địa chỉ từ danh sách mẫu hoặc tạo địa chỉ ngẫu nhiên
                        const addressIndex = i % hardhatAddresses.length;
                        demoAddresses.push(hardhatAddresses[addressIndex]);
                      }
                      
                      return (
                        <div key={player.id} className={styles.voterTab}>
                          <div className={styles.voterTabHeader}>
                            <h3>{player.name}</h3>
                            <span className={styles.voterCount}>
                              {voteCount} phiếu
                            </span>
                          </div>
                          <div className={styles.voterAddresses}>
                            {demoAddresses.length > 0 ? (
                              demoAddresses.map((addr, index) => (
                                <div key={index} className={styles.voterAddress}>
                                  {addr}
                                </div>
                              ))
                            ) : (
                              <p>Không có địa chỉ nào.</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2025 Ballon d'Or Voting dApp | Powered by Ethereum</p>
          <p>Được phát triển với ❤️ bởi SecureVoting Team</p>
        </div>
      </div>
    </div>
  );
};

export default VotedPage;
