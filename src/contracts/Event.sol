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
    uint public numTicketsLeft;
    uint public price;
    // Percent royalty event creator receives from ticket resales
    uint public royaltyPercent;
    // For each user, store corresponding ticket struct
    // mapping(address => Ticket) tickets;
    bool public canBeResold;
    address public owner;

    // EVENTS
    event CreateTicket(address buyer, uint ticketID);
    event TicketSold(address seller, address buyer, uint ticketID);
    event TicketForSale(address seller, uint ticketID, uint price);

    // Creates a new Event Contract
    constructor(uint _numTickets, uint _price, bool _canBeResold, uint _royaltyPercent, string memory _eventName, string memory _eventSymbol) ERC721("EventName", "EventSymbol") {
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
        //tickets[ticketID] = t;
        numTicketsLeft--;

        // Mint NFT
        _mint(msg.sender, ticketID);
        emit CreateTicket(msg.sender, ticketID);
    }

    function buyTicketFromUser(address userAdd, uint ticketID) public payable requiredStage(Stages.Active) hasEnoughMoney(msg.value) canBeSold(ticketID) {
        // make the user payable
        address payable seller = payable(userAdd);

        // calc price to pay after royalty
        uint ticketPrice = tickets[ticketID].price;
        uint royalty = (royaltyPercent/100) * ticketPrice;
        uint priceToPay = ticketPrice - royalty;

        //transfer money to seller
        seller.transfer(priceToPay);
        tickets[ticketID].forSale = false;
        emit TicketSold(seller, msg.sender, ticketID);
    }

    // Set ticket for sale
    function setTicketForSale(uint ticketID, uint newPrice) public requiredStage(Stages.Active) ticketNotUsed(ticketID) {
        tickets[ticketID].forSale = true;
        tickets[ticketID].price = newPrice;
        emit TicketForSale(msg.sender, ticketID, tickets[ticketID].price);
    }

    // Set new stage
    function setStage(Stages _stage) public {
        stage = _stage;
    }

    // // getter function for ticket
    // function getTicket(uint ticketID) public {
    //     return tickets[ticketID];
    // }




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

    modifier canBeSold(uint ticketID) {
        require(tickets[ticketID].forSale == true, "ticket not for sale");
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