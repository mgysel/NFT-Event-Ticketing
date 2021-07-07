// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Color is ERC721 {

    enum States { Prep, Active, Open, Paused, Cancelled, Closed }
    // Ticket struct 
    struct Ticket {

    }
    int numTickets;
    int ticketPrice;
    // For each user, store corresponding ticket struct
    mapping(address => Ticket) tickets;
    bool canBeResold;
    address public manager;


    constructor() public {

    }

    // Functions here

    // Modifiers here
}