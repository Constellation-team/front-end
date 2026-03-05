const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 public value;

    event ValueChanged(uint256 newValue);

    function set(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }

    function get() public view returns (uint256) {
        return value;
    }
}`;

const ERC20_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        require(_to != address(0), "Invalid address");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        require(_to != address(0), "Invalid address");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}`;

const ERC721_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyNFT {
    string public name;
    string public symbol;
    uint256 private _tokenIdCounter;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        require(_owner != address(0), "Invalid address");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function mint(address to) public onlyOwner returns (uint256) {
        require(to != address(0), "Invalid address");
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _owners[tokenId] = to;
        _balances[to]++;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_owners[tokenId] == from, "Not the token owner");
        require(to != address(0), "Invalid address");
        require(
            msg.sender == from || msg.sender == _tokenApprovals[tokenId],
            "Not authorized"
        );
        _owners[tokenId] = to;
        _balances[from]--;
        _balances[to]++;
        delete _tokenApprovals[tokenId];
        emit Transfer(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) public {
        require(_owners[tokenId] == msg.sender, "Not the token owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(msg.sender, to, tokenId);
    }
}`;

const CROWDFUNDING_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    address public owner;
    uint256 public goal;
    uint256 public deadline;
    uint256 public totalContributed;
    bool public claimed;

    mapping(address => uint256) public contributions;

    event Contributed(address indexed contributor, uint256 amount);
    event GoalReached(uint256 totalAmount);
    event FundsClaimed(address indexed owner, uint256 amount);
    event Refunded(address indexed contributor, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(uint256 _goal, uint256 _durationInDays) {
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + (_durationInDays * 1 days);
    }

    function contribute() public payable {
        require(block.timestamp < deadline, "Campaign ended");
        require(msg.value > 0, "Must send ETH");
        contributions[msg.sender] += msg.value;
        totalContributed += msg.value;
        emit Contributed(msg.sender, msg.value);
        if (totalContributed >= goal) {
            emit GoalReached(totalContributed);
        }
    }

    function claimFunds() public onlyOwner {
        require(block.timestamp >= deadline, "Campaign not ended");
        require(totalContributed >= goal, "Goal not reached");
        require(!claimed, "Already claimed");
        claimed = true;
        uint256 amount = address(this).balance;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsClaimed(owner, amount);
    }

    function refund() public {
        require(block.timestamp >= deadline, "Campaign not ended");
        require(totalContributed < goal, "Goal was reached");
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "No contributions");
        contributions[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund failed");
        emit Refunded(msg.sender, amount);
    }

    receive() external payable {
        contribute();
    }
}`;

const VOTING_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Proposal {
        string description;
        uint256 voteCount;
    }

    address public chairperson;
    mapping(address => bool) public hasVoted;
    Proposal[] public proposals;

    event Voted(address indexed voter, uint256 indexed proposalIndex);
    event ProposalCreated(uint256 indexed index, string description);

    modifier onlyChairperson() {
        require(msg.sender == chairperson, "Not chairperson");
        _;
    }

    constructor() {
        chairperson = msg.sender;
    }

    function addProposal(string memory _description) public onlyChairperson {
        proposals.push(Proposal({description: _description, voteCount: 0}));
        emit ProposalCreated(proposals.length - 1, _description);
    }

    function vote(uint256 _proposalIndex) public {
        require(!hasVoted[msg.sender], "Already voted");
        require(_proposalIndex < proposals.length, "Invalid proposal");
        hasVoted[msg.sender] = true;
        proposals[_proposalIndex].voteCount++;
        emit Voted(msg.sender, _proposalIndex);
    }

    function getWinner() public view returns (string memory winnerDescription, uint256 winnerVoteCount) {
        require(proposals.length > 0, "No proposals");
        uint256 winningIndex = 0;
        for (uint256 i = 1; i < proposals.length; i++) {
            if (proposals[i].voteCount > proposals[winningIndex].voteCount) {
                winningIndex = i;
            }
        }
        winnerDescription = proposals[winningIndex].description;
        winnerVoteCount = proposals[winningIndex].voteCount;
    }

    function getProposalCount() public view returns (uint256) {
        return proposals.length;
    }
}`;

const MULTISIG_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSigWallet {
    address[] public owners;
    uint256 public required;

    struct Transaction {
        address to;
        uint256 value;
        bool executed;
        uint256 confirmations;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    mapping(address => bool) public isOwner;

    event Submitted(uint256 indexed txId);
    event Confirmed(uint256 indexed txId, address indexed owner);
    event Executed(uint256 indexed txId);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid required");
        for (uint256 i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Invalid owner");
            require(!isOwner[_owners[i]], "Duplicate owner");
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        required = _required;
    }

    function submit(address _to, uint256 _value) public onlyOwner {
        transactions.push(Transaction({to: _to, value: _value, executed: false, confirmations: 0}));
        emit Submitted(transactions.length - 1);
    }

    function confirm(uint256 _txId) public onlyOwner {
        require(_txId < transactions.length, "Invalid tx");
        require(!isConfirmed[_txId][msg.sender], "Already confirmed");
        isConfirmed[_txId][msg.sender] = true;
        transactions[_txId].confirmations++;
        emit Confirmed(_txId, msg.sender);
    }

    function execute(uint256 _txId) public onlyOwner {
        Transaction storage txn = transactions[_txId];
        require(!txn.executed, "Already executed");
        require(txn.confirmations >= required, "Not enough confirmations");
        txn.executed = true;
        (bool success, ) = txn.to.call{value: txn.value}("");
        require(success, "Tx failed");
        emit Executed(_txId);
    }

    receive() external payable {}
}`;

export interface ContractTemplate {
  name: string;
  template: string;
  icon: string;
  description: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    name: 'SimpleStorage',
    template: DEFAULT_CONTRACT,
    icon: '📦',
    description: 'Basic storage contract'
  },
  {
    name: 'ERC20',
    template: ERC20_TEMPLATE,
    icon: '🪙',
    description: 'Fungible token'
  },
  {
    name: 'ERC721',
    template: ERC721_TEMPLATE,
    icon: '🖼️',
    description: 'NFT collection'
  },
  {
    name: 'Crowdfunding',
    template: CROWDFUNDING_TEMPLATE,
    icon: '💰',
    description: 'Fundraising campaign'
  },
  {
    name: 'Voting',
    template: VOTING_TEMPLATE,
    icon: '🗳️',
    description: 'Voting system'
  },
  {
    name: 'MultiSig',
    template: MULTISIG_TEMPLATE,
    icon: '🔐',
    description: 'Multi-signature wallet'
  }
];

export function getTemplate(name: string): string {
  const template = CONTRACT_TEMPLATES.find(t => t.name === name);
  return template ? template.template : DEFAULT_CONTRACT;
}

export function extractContractName(sourceCode: string): string {
  const match = sourceCode.match(/contract\s+(\w+)/);
  return match ? match[1] : 'Contract';
}
