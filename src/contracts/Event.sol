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
    function createEvent(uint32 _numTickets, uint32 _price, bool _canBeResold, uint8 _royaltyPercent,
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
    /// Valid - Ticket is Valid
    /// Used - Ticket is used
    /// AvailableForSale - Ticket is allowed to be sold to someone
    enum TicketStatus {Valid, Used, AvailableForSale }
    
    // Ticket struct 
    struct Ticket {
        uint32 price;
        uint32 resalePrice;
        TicketStatus status;
    }
    uint32 public numTicketsLeft;
    uint32 public price;
    
    /// Percent royalty event creator receives from ticket resales
    uint8 public royaltyPercent;
    
    // For each user, store corresponding ticket struct
    Ticket[] public tickets;
    
    // if ticket can be resold in the second market
    bool public canBeResold;
    
    // if event is cancelled
    bool public isCancelled;
    
    // orginizer of event
    address payable public owner;
    
    // to store the balances for buyers and organizers
    mapping(address => uint) public balances;

    // EVENTS
    event CreateTicket(address buyer, uint ticketID);
    event WithdrawMoney(address receiver, uint money);
    event OwnerWithdrawMoney(address owner, uint money);
    event TicketUsed(string sQRCodeKey);
    event  StageChangeTo(stage);

    // Creates a new Event Contract
    constructor(address _owner, uint32 _numTickets, uint32 _price, bool _canBeResold, uint8 _royaltyPercent,
            string memory _eventName, string memory _eventSymbol) ERC721(_eventName, _eventSymbol) {
            
        // Check valid constructor arguments
        require(_royaltyPercent >= 0 && _royaltyPercent <= 100, "Royalty Percentage must be between 0 and 100");
        // Number of tickets must be greater than 0
        require(_numTickets > 0, "The number of tickets must be greater than 0");
        // EventName, EventSymbol cannot be empty string
        bytes memory eventNameBytes = bytes(_eventName);
        bytes memory eventSymbolBytes = bytes(_eventSymbol);
        require(eventNameBytes.length != 0, "Event Name cannot be empty");
        require(eventSymbolBytes.length != 0, "Event Symbol cannot be empty");
        
        owner = payable(_owner);
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

        // Store t in tickets array
        tickets.push(t);
        uint ticketID = tickets.length - 1;
        numTicketsLeft--;
        
        // store overpaid in balances
        if (msg.value > price) {
            uint amount = msg.value - price;
            balances[msg.sender] += amount;
            
        }
        balances[owner] = price;
        // Mint NFT
        _safemint(msg.sender, ticketID);
        emit CreateTicket(msg.sender, ticketID);

        return ticketID;
    }
    
    /**
     * @notice Change Stage to closed
     * @dev Only owner , only able to close in Stages.Cancelled or Stages.CheckinOpen
     */
    function setStageToClosed() public onlyOwner ableToClose returns (Stages) {
        stage == Stage.Closed;
        emit StageChangeTo(stage);
        return stage;
    }
    
    function setStageToPause() public onlyOwner requiredStage(Stages.Active) returns (Stages) {
        stage == Stage.Paused;
        emit StageChangeTo(stage);
        return stage;
    }
    
    function setStageToActive() public onlyOwner ableToActive returns (Stages) {
        stage == Stage.Active;
        emit StageChangeTo(stage);
        return stage;
    }
    
    function setStageToCheckinOpen() public onlyOwner ableToCheckinOpen returns (Stages) {
        stage == Stage.CheckinOpen;
        emit StageChangeTo(stage);
        return stage;
    }
    
    function setStageToCancelled() public onlyOwner ableToCancelled returns (Stages) {
        stage == Stage.Cancelled;
        balances[owner] -= price * ticketCounter;
        isCancelled = true;
        emit StageChangeTo(stage);
        return stage;
    }
    
    /** TODO set to Stage randomly will affect withdraw
     * @notice Change Status
     * @dev Only owner can change state
     * @param _stage Stages as set in enum Stages
     */
    // function setStage(Stages _stage) public onlyOwner returns (Stages) {
    //     stage = _stage;
    //     emit StageChangeTo(stage);
    //     return stage;
    // }
    
    /**
     * @notice Mark ticket as used
     * @dev Only a valid buyer can mark ticket as used
     * @param sQRCodeKey QR Code key sent by the app 
     */
    function setTicketToUsed( uint ticketID, string memory sQRCodeKey) public requiredStage(Stages.CheckinOpen)
                                                                    returns (string memory){
		// Validate that user has a ticket they own and it is valid
        require (tickets[ticketID].status == TicketStatus.Valid, "There is no valid ticket for this user");

        // Ticket is valid so mark it as used
        tickets[ticketID].status = TicketStatus.Used;

        // Raise event which Gate Management system can consume then
        emit TicketUsed(sQRCodeKey, ticketID);
        
        return sQRCodeKey;
	}
	
    /**
     * @notice owner can only withdraw what's in the balances
     * @dev once the event is cancelled, organizer should refund money to buyers
     */
    function ownerWithdraw() public onlyOwner requiredStage(Stages.Closed) {
        uint ownerBalance = balances[owner];
        require(ownerBalance > 0, "No money to withdraw");
        
        // Transfer money to owner
        bool sent = owner.transfer(ownerBalance);
        // Failure condition if cannot transfer
        require(sent, "Failed to send ether to owner");
        // Update balance after transfering money
        balances[msg.sender] = 0;
        emit OwnerWithdrawMoney(msg.sender, ownerBalance);
    }

    /**
     * @notice User to withdraw money 
     * @dev User can withdraw money if event cancelled or overpaid for ticket
     */
    function withdraw() public {
        require(msg.sender != owner, "Can not be executed by the owner");
        // Amount to send to user
        uint sendToUser = balances[msg.sender];
        
        // If event cancelled, send user the amount they overpaid for ticket + ticket price refund
        if (isCancelled) {
            // Update isUserRefunded before sending money
            isUserRefunded[msg.sender] = true;
            sendToUser += balanceOf(msg.sender) * price;
        }

        // Cannot withdraw if no money to withdraw
        require(sendToUser > 0, "User does not have money to withdraw");
        
        // Transfer money to user
        address payable receiver = payable(msg.sender);
        bool sent = receiver.transfer(sendToUser);
        // Failure condition of send will emit this error
        require(sent, "Failed to send ether to user");
        // Update balance after transfering money
        balances[msg.sender] = 0;
        emit WithdrawMoney(msg.sender, sendToUser);
        
    }


    // MODIFIERS

    // Only owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Can only be executed by the owner");
        _;
    }

    // Requires stage to be _stage
    modifier requiredStage(Stages _stage) {
        require(stage == _stage, "Cannot execute function at this stage");
        _;
    }
    
    // Check if buying is open
    modifier buyingTicketOpen() {
        require(stage == Stages.Active || stage == Stages.CheckinOpen, "Cannot buy ticket at this stage");
        _;
    }

    // Requires there to be more than 0 tickets left
    modifier ticketsLeft() {
        require(numTicketsLeft > 0, "There are 0 tickets left");
        _;
    }

    // Requires user to have enough money to purchase ticket
    modifier hasEnoughMoney(uint money) {
        require(money >= price, "Not enough money to purchase a ticket");
        _;
    }
    
    // Requires stage condition to change to closed stage
    modifier ableToClose() {
        require(stage == Stages.CheckinOpen || stage == Stages.Cancelled, "Can only set stage from cancelled or checkinOpen");
        _;
    }
    
    // Requires stage condition to change to active stage
    modifier ableToActive() {
        require(stage == Stages.Prep || stage == Stages.Paused, "Can only set stage from Prep or Paused");
        _;
    }
    
    // Requires stage condition to change to checkinOpen stage
    modifier ableToCheckinOpen() {
        require(stage == Stages.Paused || stage == Stages.Active, "Can only set stage from Active or Paused");
        _;
    }
    
    // Requires stage condition to change to cancelled stage
    modifier ableToCancelled() {
        require(stage == Stages.Active || stage == Stages.Paused, "Can only set stage from cancelled or checkinOpen");
        _;
    }
    
    
    
    
}

