// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title GoldenBallVoting
 * @dev Hop dong ballon_dOr bo phieu 10 cau thu bong da
 */
contract GoldenBallVoting {
    // Cau truc du lieu cho cau thu
    struct Player {
        string name;
        string team;
        uint256 voteCount;
    }

    // Dia chi cua chu hop dong
    address public owner;

    // Thoi gian bat dau va ket thuc cua cuoc bo phieu
    uint256 public startTime;
    uint256 public endTime;

    // Mang luu tru danh sach 10 cau thu
    Player[10] public players;

    // Mapping de theo doi dia chi da bo phieu hay chua
    mapping(address => bool) public hasVoted;

    // So luong cau thu hien tai da duoc them vao
    uint8 public playerCount;

    // Su kien khi co nguoi bo phieu
    event Voted(address voter, uint8 playerId);
    // Su kien khi them cau thu moi
    event PlayerAdded(string name, string team);
    // Su kien khi cong bo ket qua
    event ResultAnnounced(string winnerName, uint256 voteCount);

    // Chi chu hop dong moi co the goi ham
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi chu hop dong moi co quyen thuc hien");
        _;
    }

    // Dam bao thoi gian bo phieu dang dien ra
    modifier votingActive() {
        require(block.timestamp >= startTime, "Cuoc bo phieu chua bat dau");
        require(block.timestamp < endTime, "Cuoc bo phieu da ket thuc");
        _;
    }

    /**
     * @dev Khoi tao hop dong bo phieu
     * @param _startTime Thoi gian bat dau cuoc bo phieu (Unix timestamp)
     * @param _durationInMinutes Thoi gian keo dai cua cuoc bo phieu (phut)
     */
    constructor(uint256 _startTime, uint256 _durationInMinutes) {
        owner = msg.sender;
        startTime = _startTime;
        endTime = _startTime + (_durationInMinutes * 1 minutes);
        playerCount = 0;
    }

    /**
     * @dev Them cau thu vao danh sach bo phieu
     * @param _name Ten cua cau thu
     * @param _team Doi bong cua cau thu
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
     * @dev Bo phieu cho cau thu
     * @param _playerId ID cua cau thu (0-9)
     */
    function vote(uint8 _playerId) public votingActive {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        require(!hasVoted[msg.sender], "Ban da bo phieu roi");
        
        players[_playerId].voteCount++;
        hasVoted[msg.sender] = true;
        
        emit Voted(msg.sender, _playerId);
    }

    /**
     * @dev Lay thong tin cua cau thu
     * @param _playerId ID cua cau thu (0-9)
     * @return name Ten cua cau thu
     * @return team Doi bong cua cau thu
     * @return voteCount So phieu bau
     */
    function getPlayer(uint8 _playerId) public view returns (string memory name, string memory team, uint256 voteCount) {
        require(_playerId < playerCount, "Ma cau thu khong hop le");
        Player memory player = players[_playerId];
        return (player.name, player.team, player.voteCount);
    }

    /**
     * @dev Xac dinh nguoi chien thang cua cuoc bo phieu
     * @return winnerId ID cua cau thu thang cuoc
     * @return winnerName Ten cua cau thu thang cuoc
     * @return winningVoteCount So phieu bau cua cau thu thang cuoc
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
     * @dev Cong bo ket qua cuoc bo phieu
     * Chi co the duoc goi sau khi cuoc bo phieu ket thuc
     */
    function announceResult() public onlyOwner {
        require(block.timestamp >= endTime, "Cuoc bo phieu chua ket thuc");
        
        (,string memory winnerName, uint256 winningVoteCount) = getWinner();
        emit ResultAnnounced(winnerName, winningVoteCount);
    }
}