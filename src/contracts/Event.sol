// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Color is ERC721 {

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
    // For each user, store corresponding ticket struct
    // mapping(address => Ticket) tickets;
    bool canBeResold;
    address public owner;

    // EVENTS
    event CreateNFTTicket(address buyer, uint NFTID);

    // Creates a new Event Contract
    constructor(uint numTickets, uint price, bool canBeResold) public {
        owner = msg.sender;
        numTicketsLeft = numTickets;
        price = price;
        canBeResold = canBeResold;
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

        // Mint NFT
        _mint(msg.sender, NFTID);
        emit CreateNFTTicket(msg.sender, NFTID);
    }

    // Set new stage
    function setStage(Stages _stage) public {
        stage = _stage;
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

}