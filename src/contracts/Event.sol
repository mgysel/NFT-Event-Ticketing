// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Event is ERC721 {

    enum Stages { Prep, Active, Paused, CheckinOpen, Cancelled, Closed }
    Stages public stage = Stages.Prep;
    // Ticket struct 
    struct Ticket {
        address owner;
        uint price;
        bool forSale;
        bool used;
    }
    Ticket[] tickets; 
    uint numTicketsLeft;
    uint price;
    // Percent royalty event creator receives from ticket resales
    uint royaltyPercent;
    // For each user, store corresponding ticket struct
    // mapping(address => Ticket) tickets;
    bool canBeResold;
    address public owner;
    
    // to store the balances for buyers and organizers
    mapping(address => uint256) balances;

    // EVENTS
    event CreateNFTTicket(address buyer, uint NFTID);
    event WithdrawalMoney(address receiver, uint money);
    event Refund(address organizer, address receiver, uint money);

    // Creates a new Event Contract
    constructor(uint _numTickets, uint _price, bool _canBeResold, uint _royaltyPercent) ERC721("EventName", "EventSymbol") {
        owner = msg.sender;
        numTicketsLeft = _numTickets;
        price = _price;
        canBeResold = _canBeResold;
        royaltyPercent = _royaltyPercent;
    }

    // Customer purchases a ticket from Organizer
    // Checks: State is Active, has enough money, 
    function buyTicket() public payable requiredStage(Stages.Active) ticketsLeft hasEnoughMoney(msg.value) {
        // Create Ticket t
        Ticket memory t;
        t.owner = msg.sender;
        t.price = price;
        t.forSale = false;
        t.used = false;

        // Store t in tickets array, reduce numTicketsLeft
        tickets.push(t);
        uint NFTID = tickets.length;
        numTicketsLeft--;
        
        // new added
        balances[owner] += price;

        // Mint NFT
        _mint(msg.sender, NFTID);
        emit CreateNFTTicket(msg.sender, NFTID);
    }

    // Set new stage
    function setStage(Stages _stage) public {
        stage = _stage;
    }


    // once the event is cancelled, organizer should refund money to buyers
    function refund(address receiver, uint money) public isOrganizer returns (bool success){
        require (money > 0);
        require(balances[msg.sender] >= money, "Not enough money");
        emit Refund(msg.sender, receiver, money);
        balances[msg.sender] -= money;
        balances[receiver] += money;
        return true;
    }
    
    
    // for user and organizer to  withdrawal money from their account
    function withdrawal(uint money) public returns (bool success){
        require(balances[msg.sender] >= money, "Not enough money");
        emit WithdrawalMoney(msg.sender, money);
        balances[msg.sender] -= money;
        return true;
    }


    // MODIFIERS

    // Requires stage to be _stage
    modifier requiredStage(Stages _stage) {
        require(stage == _stage);
        _;
    }

    // Requires there to be more than 0 tickets left
    modifier ticketsLeft() {
        require(numTicketsLeft > 0);
        _;
    }

    modifier hasEnoughMoney(uint money) {
        require(money >= price);
        _;
    }
    
    modifier isOrganizer () {
        require (msg.sender == owner , "Can only be executed by the organizer");
        _;
    }
}

