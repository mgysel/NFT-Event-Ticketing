// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
 
/// @title Factory Contract to create events
contract EventCreator {

    // Created events
    Event[] public events;

    // EVENTS
    event CreateEvent(address _creator, address _event);

    /**
     * @notice Creates Events
     * @param _numTickets Number of tickets 
     * @param _price Price per ticket
     * @param _canBeResold Are tickets allowed to be resold
     * @param _royaltyPercent Royalty percentage accrued by organizers on reselling of ticket
     * @param _eventName Name of the Ticket NFT
     * @param _eventSymbol Symbol for the Ticket NFT Token
     */
    function createEvent(uint32 _numTickets, uint32 _price, bool _canBeResold, uint32 _royaltyPercent,
            string memory _eventName, string memory _eventSymbol) external returns(address newEvent) {
        // Create a new Event smart contract
        // NOTE: 'new' keyword creates a new SC and returns address
        Event e = new Event(msg.sender, _numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol);
        
        // Store/return event address
        events.push(e);
        address eventAddress = address(e);
        emit CreateEvent(msg.sender, eventAddress);

        // QUESTION: I cannot return this because async??
        return eventAddress;
    }


    /**
     * @notice Retrieve number of events
     */
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

/// @title Contract to mint tickets of an event
contract Event is ERC721 {
    /// Control Event Status at a granular level
    /// Prep - Allows administrator to maintain event
    /// Active - Buying tickets allowed
    /// Paused - Buying tickets not allowed
    /// CheckinOpen - Buyer can checkin to attend the event
    /// Cancelled - Event is cancelled. Money can be refunded to buyers
    /// Closed - Event is closed
    enum Stages { Prep, Active, Paused, CheckinOpen, Cancelled, Closed }
    Stages public stage = Stages.Prep;
    
    /// Control Ticket Status at a granular level
    /// Invalid - Ticket is not valid
    /// Valid - Ticket is Valid
    /// Used - Ticket is used
    /// AvailableForSale - Ticket is allowed to be sold to someone
    enum TicketStatus { Invalid, Valid, Used, AvailableForSale }
    
    // Ticket struct 
    struct Ticket {
        uint32 price;
        uint32 resalePrice;
        TicketStatus status;
    }
    uint32 public numTicketsLeft;
    uint32 public price;
    
    /// Percent royalty event creator receives from ticket resales
    uint32 public royaltyPercent;
    
    // For each user, store corresponding ticket struct
    mapping(address => Ticket) public tickets;
    
    bool public canBeResold;
    address public owner;
    
    // to store the balances for buyers and organizers
    mapping(address => uint) public balances;
    mapping(address => bool) public isUserRefunded;

    // EVENTS
    event CreateTicket(address buyer, uint ticketID);
    event WithdrawMoney(address receiver, uint money);
    event Refund(address organizer, address receiver, uint money);
    event TicketUsed(string sQRCodeKey);

    // Creates a new Event Contract
    constructor(address _owner, uint32 _numTickets, uint32 _price, bool _canBeResold, uint32 _royaltyPercent,
            string memory _eventName, string memory _eventSymbol) ERC721(_eventName, _eventSymbol) {
        owner = _owner;
        numTicketsLeft = _numTickets;
        price = _price;
        canBeResold = _canBeResold;
        royaltyPercent = _royaltyPercent;
    }

    /**
     * @notice Buy tickets
     * @dev Checks: State is Active, has enough money
     */
    function buyTicket() public payable buyingTicketOpen ticketsLeft 
                                            hasEnoughMoney(msg.value) returns (uint){
        // Create Ticket t
        Ticket memory t;
        t.price = price;
        t.resalePrice = price;
        t.status = TicketStatus.Valid;

        uint ticketID = numTicketsLeft;

        // Mint NFT
        _mint(msg.sender, ticketID);
        emit CreateTicket(msg.sender, ticketID);

        // Store t in tickets mapping, reduce numTicketsLeft
        tickets[msg.sender] = t;
        numTicketsLeft--;

        // If user overpaid, add difference to balances
        if (msg.value > price) {
            balances[msg.sender] = msg.value - price;
        }
        
        return ticketID;
    }

    /**
     * @notice Change Status
     * @dev Only owner can change state
     * @param _stage Stages as set in enum Stages
     */
    function setStage(Stages _stage) public onlyOwner returns (Stages) {
        stage = _stage;
        return stage;
    }
    
    /**
     * @notice Mark ticket as used
     * @dev Only a valid buyer can mark ticket as used
     * @param sQRCodeKey QR Code key sent by the app 
     */
    function setTicketToUsed(string memory sQRCodeKey) public requiredStage(Stages.CheckinOpen)
                                                                    returns (string memory){
		// Validate that user has a ticket they own and it is valid
        require (tickets[msg.sender].status == TicketStatus.Valid, "There is no valid ticket for this user");

        // Ticket is valid so mark it as used
        tickets[msg.sender].status = TicketStatus.Used;

        // Raise event which Gate Management system can consume then
        emit TicketUsed(sQRCodeKey);
        
        return sQRCodeKey;
	}
	
    // TODO - WHY DO WE NEED REFUND? 
    /**
     * @notice Refund money to buyers
     * @dev once the event is cancelled, organizer should refund money to buyers
     * @param receiver Receiver of the ether
     * @param money Amount of ether to refund 
     */
    function refund(address receiver, uint money) public onlyOwner returns (bool success){
        require (money > 0);
        require(balances[msg.sender] >= money, "Not enough money");
        emit Refund(msg.sender, receiver, money);
        balances[msg.sender] -= money;
        balances[receiver] += money;
        return true;
    }

    /**
     * @notice For user to withdraw money from their account
     */
    function withdraw() public returns (bool success) {
        // Amount to send to user
        uint sendToUser = balances[msg.sender];

        // Update balance before sending money
        balances[msg.sender] = 0;
        
        // If event cancelled, send user the amount they overpaid for ticket + ticket price refund
        if ((stage == Stages.Cancelled || stage == Stages.Paused) && isUserRefunded[msg.sender] == false) {
            // Update isUserRefunded before sending money
            isUserRefunded[msg.sender] = true;
            sendToUser += price;
        }

        // Cannot withdraw if no money to withdraw
        require(sendToUser > 0, "User does not have money to withdraw");

        // Transfer money to user
        address payable receiver = payable(msg.sender);
        bool sent = receiver.send(sendToUser);
        // Failure condition of send will emit this error
        require(sent, "Failed to send ether to user");

        emit WithdrawMoney(msg.sender, sendToUser);
        
        return true;
    }


    // MODIFIERS

    // Only owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Can only be executed by the owner");
        _;
    }

    // Requires stage to be _stage
    modifier requiredStage(Stages _stage) {
        require(stage == _stage);
        _;
    }
    
    // Check if buying is open
    modifier buyingTicketOpen() {
        require(stage == Stages.Active || stage == Stages.CheckinOpen);
        _;
    }

    // Requires there to be more than 0 tickets left
    modifier ticketsLeft() {
        require(numTicketsLeft > 0);
        _;
    }

    // Requires user to have enough money to purchase ticket
    modifier hasEnoughMoney(uint money) {
        require(money >= price);
        _;
    }
    
}

