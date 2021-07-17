// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
 
contract EventCreator {

    // Created events
    Event[] public events;

    // EVENTS
    event CreateEvent(address _creator, address _event);

    // Deploy a new event contract
    function createEvent(uint32 _numTickets, uint32 _price, bool _canBeResold, uint32 _royaltyPercent, string memory _eventName, string memory _eventSymbol) external returns(address newEvent) {
        // Create a new Event smart contract
        // NOTE: 'new' keyword creates a new SC and returns address
        Event e = new Event(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol);
        
        // Store/return event address
        events.push(e);
        address eventAddress = address(e);
        emit CreateEvent(msg.sender, eventAddress);

        // QUESTION: I cannot return this because async??
        return eventAddress;
    }

    // Return number of events
    function getEventCount() public view returns(uint contractCount) {
        return events.length;
    }

    // Returns array of all events
    function getEvents() external view returns(Event[] memory _events) {
        _events = new Event[] (events.length);
        for (uint i=0; i<events.length; i++){
            _events[i] = events[i];
        }

        return _events;
    }  
}

contract Event is ERC721 {

    enum Stages { Prep, Active, Paused, CheckinOpen, Cancelled, Closed }
    Stages public stage = Stages.Prep;
    // Ticket struct 
    struct Ticket {
        address owner;
        uint32 price;
        bool forSale;
        uint32 resalePrice;
        bool used;
    }
    Ticket[] tickets; 
    uint32 public numTicketsLeft;
    uint32 public price;
    // Percent royalty event creator receives from ticket resales
    uint32 public royaltyPercent;
    // For each user, store corresponding ticket struct
    // mapping(address => Ticket) tickets;
    bool public canBeResold;
    address public owner;
    
    // to store the balances for buyers and organizers
    mapping(address => uint256) balances;

    // EVENTS
    event CreateTicket(address buyer, uint ticketID);
    event WithdrawalMoney(address receiver, uint money);
    event Refund(address organizer, address receiver, uint money);

    // Creates a new Event Contract
    constructor(uint32 _numTickets, uint32 _price, bool _canBeResold, uint32 _royaltyPercent, string memory _eventName, string memory _eventSymbol) ERC721(_eventName, _eventSymbol) {
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
        t.resalePrice = price;
        t.forSale = false;
        t.used = false;

        // Store t in tickets array, reduce numTicketsLeft
        tickets.push(t);
        uint ticketID = tickets.length;
        numTicketsLeft--;
        
        // new added
        balances[owner] += price;

        // Mint NFT
        _mint(msg.sender, ticketID);
        emit CreateTicket(msg.sender, ticketID);
    }

    // Set new stage
    function setStage(Stages _stage) public restricted {
        stage = _stage;
    }


    // once the event is cancelled, organizer should refund money to buyers
    function refund(address receiver, uint money) public restricted returns (bool success){
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

    // Only owner
    modifier restricted() {
        require(msg.sender == owner, "Can only be executed by the owner");
        _;
    }

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
    
}

