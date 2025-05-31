// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title GoldenBallVoting
 * @dev Hợp đồng bầu chọn Golden Ball cho 10 cầu thủ bóng đá
 */
contract GoldenBallVoting {
    // Cấu trúc dữ liệu cho cầu thủ
    struct Player {
        string name;
        string team;
        uint256 voteCount;
    }

    // Địa chỉ của chủ hợp đồng
    address public owner;

    // Thời gian bắt đầu và kết thúc của cuộc bỏ phiếu
    uint256 public startTime;
    uint256 public endTime;

    // Mảng lưu trữ danh sách 10 cầu thủ
    Player[10] public players;

    // Mapping để theo dõi địa chỉ đã bỏ phiếu hay chưa
    mapping(address => bool) public hasVoted;

    // Mapping để theo dõi cầu thủ mà mỗi địa chỉ đã bỏ phiếu
    mapping(address => uint8) public votedFor;

    // Mapping để lưu trữ danh sách các địa chỉ đã bỏ phiếu cho mỗi cầu thủ
    mapping(uint8 => address[]) public votersForPlayer;

    // Số lượng cầu thủ hiện tại đã được thêm vào
    uint8 public playerCount;

    // Sự kiện khi có người bỏ phiếu
    event Voted(address voter, uint8 playerId);
    // Sự kiện khi thêm cầu thủ mới
    event PlayerAdded(string name, string team);
    // Sự kiện khi công bố kết quả
    event ResultAnnounced(string winnerName, uint256 voteCount);

    // Chỉ chủ hợp đồng mới có thể gọi hàm
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi chu hop dong moi co quy bao phieu");
        _;
    }

    // Đảm bảo thời gian bỏ phiếu đang diễn ra
    modifier votingActive() {
        require(block.timestamp >= startTime, "Cuoc bo phieu chua bat dau");
        require(block.timestamp < endTime, "Cuoc bo phieu da ket thuc");
        _;
    }

    /**
     * @dev Khởi tạo hợp đồng bỏ phiếu
     * @param _startTime Thời gian bắt đầu cuộc bỏ phiếu (Unix timestamp)
     * @param _durationInMinutes Thời gian kéo dài của cuộc bỏ phiếu (phút)
     */
    constructor(uint256 _startTime, uint256 _durationInMinutes) {
        owner = msg.sender;
        startTime = _startTime;
        endTime = _startTime + (_durationInMinutes * 1 minutes);
        playerCount = 0;
    }

    /**
     * @dev Thêm cầu thủ vào danh sách bỏ phiếu
     * @param _name Tên của cầu thủ
     * @param _team Đội bóng của cầu thủ
     */
    function addPlayer(string memory _name, string memory _team) public onlyOwner {
        require(playerCount < 10, "Da dat den gioi han so luong cau thu");
        
        players[playerCount] = Player({
            name: _name,
            team: _team,
            voteCount: 0
        });
        
        emit PlayerAdded(_name, _team);
        playerCount++;
    }

    /**
     * @dev Bỏ phiếu cho cầu thủ
     * @param _playerId ID của cầu thủ (0-9)
     */
    function vote(uint8 _playerId) public votingActive {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        require(!hasVoted[msg.sender], "Ban da bo phieu roi");
        
        players[_playerId].voteCount++;
        hasVoted[msg.sender] = true;
        votedFor[msg.sender] = _playerId;
        votersForPlayer[_playerId].push(msg.sender);  // Thêm địa chỉ vào danh sách
        
        emit Voted(msg.sender, _playerId);
    }

    /**
     * @dev Lấy thông tin của cầu thủ
     * @param _playerId ID của cầu thủ (0-9)
     * @return name Tên của cầu thủ
     * @return team Đội bóng của cầu thủ
     * @return voteCount Số phiếu bầu
     */
    function getPlayer(uint8 _playerId) public view returns (string memory name, string memory team, uint256 voteCount) {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        Player memory player = players[_playerId];
        return (player.name, player.team, player.voteCount);
    }

    /**
     * @dev Xác định người chiến thắng của cuộc bỏ phiếu
     * @return winnerId ID của cầu thủ thắng cuộc
     * @return winnerName Tên của cầu thủ thắng cuộc
     * @return winningVoteCount Số phiếu bầu của cầu thủ thắng cuộc
     */
    function getWinner() public view returns (uint8 winnerId, string memory winnerName, uint256 winningVoteCount) {
        require(block.timestamp >= endTime, "Cuoc bo phieu chua ket thuc");
        require(playerCount > 0, "Khong co cau thu nao trong danh sach");
        
        uint8 currentWinnerId = 0;
        uint256 maxVotes = 0;
        
        for (uint8 i = 0; i < playerCount; i++) {
            if (players[i].voteCount > maxVotes) {
                maxVotes = players[i].voteCount;
                currentWinnerId = i;
            }
        }
        
        return (currentWinnerId, players[currentWinnerId].name, players[currentWinnerId].voteCount);
    }

    /**
     * @dev Công bố kết quả cuộc bỏ phiếu
     * Chỉ có thể được gọi sau khi cuộc bỏ phiếu kết thúc
     */
    function announceResult() public onlyOwner {
        require(block.timestamp >= endTime, "Cuoc bo phieu chua ket thuc");
        
        (,string memory winnerName, uint256 winningVoteCount) = getWinner();
        emit ResultAnnounced(winnerName, winningVoteCount);
    }

    /**
     * @dev Lấy thông tin cầu thủ mà một địa chỉ đã bỏ phiếu
     * @param _voter Địa chỉ của người bỏ phiếu
     * @return playerId ID của cầu thủ mà người này đã bỏ phiếu, hoặc 255 nếu chưa bỏ phiếu
     */
    function getVotedPlayer(address _voter) public view returns (uint8) {
        if (hasVoted[_voter]) {
            return votedFor[_voter];
        } else {
            return 255;  // Giá trị đặc biệt để chỉ ra rằng chưa bỏ phiếu
        }
    }

    /**
     * @dev Lấy danh sách các địa chỉ đã bỏ phiếu cho một cầu thủ cụ thể
     * @param _playerId ID của cầu thủ
     * @param _startIndex Chỉ số bắt đầu của danh sách
     * @param _count Số lượng địa chỉ tối đa để trả về
     * @return addresses Mảng các địa chỉ đã bỏ phiếu cho cầu thủ đó
     */
    function getVotersForPlayer(uint8 _playerId, uint256 _startIndex, uint256 _count) public view returns (address[] memory) {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        
        address[] memory voters = votersForPlayer[_playerId];
        uint256 totalVoters = voters.length;
        
        if (_startIndex >= totalVoters) {
            return new address[](0);
        }
        
        uint256 endIndex = _startIndex + _count;
        if (endIndex > totalVoters) {
            endIndex = totalVoters;
        }
        
        address[] memory result = new address[](endIndex - _startIndex);
        for (uint256 i = _startIndex; i < endIndex; i++) {
            result[i - _startIndex] = voters[i];
        }
        
        return result;
    }

    /**
     * @dev Lấy số lượng phiếu bầu cho một cầu thủ
     * @param _playerId ID của cầu thủ
     * @return Số lượng phiếu bầu
     */
    function getVoterCountForPlayer(uint8 _playerId) public view returns (uint256) {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        return votersForPlayer[_playerId].length;
    }
}