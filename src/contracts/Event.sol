// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract Event is ERC721 {

    enum Stages { Prep, Active, Paused, CheckinOpen, Cancelled, Closed }
    Stages public stage = Stages.Prep;
    // Ticket struct 
    struct Ticket {
        address owner;
        uint32 price;
        bool forSale;
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

    // EVENTS
    event CreateTicket(address buyer, uint ticketID);
    event TicketForSale(address seller, uint ticketID, uint32 price);
    event TicketSaleCancelled(address seller, uint ticketID);

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
        t.forSale = false;
        t.used = false;

        // Store t in tickets array, reduce numTicketsLeft
        tickets.push(t);
        uint ticketID = tickets.length;
        numTicketsLeft--;

        // Mint NFT
        _mint(msg.sender, ticketID);
        emit CreateTicket(msg.sender, ticketID);
    }

    // Set ticket for sale
    function setTicketForSale(uint ticketID, uint32 newPrice) public requiredStage(Stages.Active) ticketNotUsed(ticketID) isTicketOwner(ticketID) {
        tickets[ticketID].forSale = true;
        tickets[ticketID].price = newPrice;
        emit TicketForSale(msg.sender, ticketID, newPrice);
    }

    // Cancel Ticket Sale
    function cancelSale(uint ticketID) public requiredStage(Stages.Active) isTicketOwner(ticketID) {
        tickets[ticketID].forSale = false;
        emit TicketSaleCancelled(msg.sender, ticketID);
    }
    

    // Set new stage
    function setStage(Stages _stage) public restricted {
        stage = _stage;
    }




    // MODIFIERS

    // Only owner
    modifier restricted() {
        require(msg.sender == owner, "Can only be executed by the manager");
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

    modifier ticketNotUsed(uint ticketID) {
        require(tickets[ticketID].used == false, "ticket has been used");
        _;
    }

    modifier isTicketOwner(uint ticketID) {
        require(ownerOf(ticketID) == msg.sender, "only ticket owner can sell");
        _;
    }


}