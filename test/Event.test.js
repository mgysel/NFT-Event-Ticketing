const { assert, expect } = require('chai')
const BN = require('bn.js')
const { contracts_build_directory } = require('../truffle-config')
const truffleAssert = require('truffle-assertions')

const EVM_REVERT = 'VM Exception while processing transaction: revert'

// Import smart contract using its artifact
const EventCreator = artifacts.require('./EventCreator')
const Event = artifacts.require('./Event')

// Testing library
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()


// NOTE: ETHEREUM STORES BIG NUMBERS THAT JS CANNOT COMPILE,
// FOLLOW THE describe('comparison') EXAMPLES FOR HOW TO COMPARE NUMBERS
// accounts - the accounts from Ganache
// async - to interact with blockchain, must use async calls
contract('Event', (accounts) => {
    // Variables for creating the Event Contract
    let eventCreator;
    let event;
    const _numTickets = 5;
    const _price = 50;
    const _canBeResold = true;
    const _royaltyPercent = 20;
    const _eventName = 'EventName'
    const _eventSymbol = 'EventSymbol'

    // Variables for users from Ganache
    const owner = accounts[0];
    const buyer1 = accounts[1];
    const buyer2 = accounts[2];
    const buyer3 = accounts[3];
    const buyer4 = accounts[4];
    const buyer5 = accounts[5];
    const buyer6 = accounts[6];
    const buyer7 = accounts[7];

    beforeEach(async () => {
        event = await Event.new(owner, _numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
    })

    // Describe is a container for test examples
    describe('deployment', async () => {
        // Test address
        // it containts test examples
        it('Event contract deploys successfully', async () => {
            // NOTE: can only use await inside of an async function call
            // Make sure deployed contract exists by ensuring not an empty string
            const address = event.address
            assert.notEqual(address,'')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('constructor', async () => {

        it('checking eventName', async () => {
            assert.equal(await event.name(), _eventName, 'Event name in smart contract should match event name defined in constructor')
        })

        it('checking eventSymbol', async () => {
            assert.equal(await event.symbol(), _eventSymbol, 'Event symbol in smart contract should match event symbol defined in constructor')
        })
        
        it('checking smart contract owner', async () => {
            // Check that SC owner is first account from Ganache
            assert.equal(await event.owner(), owner, 'Owner in smart contract should match owner defined in constructor')
        })

        it('checking numTicketsLeft set correctly', async () => {
            const expected = web3.utils.toBN(_numTickets)
            const numTicketsLeft = await event.numTicketsLeft()
            expect(numTicketsLeft).to.eql(expected)
        })

        it('checking price set correctly', async () => {
            const expected = web3.utils.toBN(_price)
            const price = await event.price()
            expect(price).to.eql(expected)
        })

        it('checking canBeResold set correctly', async () => {
            // Get first account from Ganache
            assert.equal(await event.canBeResold(), true, 'canBeResold in smart contract should match canBeResold defined in constructor')
        })

        it('checking royaltyPercent set correctly', async () => {
            // Get first account from Ganache
            const expected = web3.utils.toBN(_royaltyPercent)
            const royalty = await event.royaltyPercent()
            expect(royalty).to.eql(expected)
        })

        // TODO: Owner of contract is set correctly

    })

    describe('buyTicket', async () => {

        it('checking cannot buy ticket unless active stage', async () => {
            // Prep (0) Stage
            await event.setStage(0)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(2)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            await event.setStage(5)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

        beforeEach(async () => {
            // Set stage to active
            await event.setStage(1)
        })

        it('checking buyTicket Event', async () => {
            let ticket1 = await event.buyTicket({ value: _price, from: buyer1 })
            // NOTE: Inside truffleAssert, we have to return results
            truffleAssert.eventEmitted(ticket1, 'CreateTicket', (ev) => {
                // Check buyer address
                const address_expected = buyer1.toString()
                const address_actual = ev['buyer'].toString()

                // Check ticketID
                const ticketID_expected = '5'
                const ticketID_actual = ev['ticketID'].toString()
                return ticketID_actual === ticketID_expected && address_actual === address_expected
            })
        })

        it('checking user receives NFT after buying ticket', async () => {
            let bal = await event.balanceOf(buyer1, { from: buyer1 })
            assert.equal(bal, 0, 'Customer should have 0 NFTs before purchasing any tickets')
            
            await event.buyTicket({ value: _price, from: buyer1 })
            bal = await event.balanceOf(buyer1, { from: buyer1 })
            assert.equal(bal, 1, 'Customer should have 1 NFT after purchasing ticket')

            await event.buyTicket({ value: _price, from: buyer1 })
            bal = await event.balanceOf(buyer1, { from: buyer1 })
            assert.equal(bal, 2, 'Customer should have 2 NFTs after purchasing two ticket')

        })

        it('checking SC balance increases after ticket purchase', async () => {
            let balanceBefore = parseInt(await web3.eth.getBalance(event.address))
            let ticket1 = await event.buyTicket({ value: _price, from: buyer1 })
            let balanceAfter = parseInt(await web3.eth.getBalance(event.address))

            expect(parseInt(balanceBefore) + _price).to.eql(parseInt(balanceAfter))

        })

        it('checking buyer balance decreases after ticket purchase', async () => {
            let balanceBefore = parseInt(await web3.eth.getBalance(buyer1))
            let ticket1 = await event.buyTicket({ value: _price, from: buyer1 })
            let balanceAfter = parseInt(await web3.eth.getBalance(buyer1))

            expect(balanceBefore - _price).to.be.greaterThan(balanceAfter)

        })

        it('checking not enough money to buy ticket', async () => {
            await event.buyTicket({ value: (_price - 1), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

       it('checking numTicketsLeft Decrements', async () => {
            const numTicketsBefore = await event.numTicketsLeft()
            await event.buyTicket({ value: _price, from: buyer1 })
            const numTicketsAfter = await event.numTicketsLeft()

            expect(numTicketsBefore.sub(new BN('1'))).to.be.a.bignumber.that.equals(numTicketsAfter)
        })

        // Not enough tickets left
        it('checking not enough tickets left', async () => {
            await event.buyTicket({ value: (_price), from: buyer2 }) 
            await event.buyTicket({ value: (_price), from: buyer3 })   
            await event.buyTicket({ value: (_price), from: buyer4 })
            await event.buyTicket({ value: (_price), from: buyer5 })
            await event.buyTicket({ value: (_price), from: buyer6 })
            await event.buyTicket({ value: (_price), from: buyer7 }).should.be.rejectedWith(EVM_REVERT)
        })

    })

    describe('setTicketToUsed', async () => {

        it('checking cannot set Ticket To Used unless Checkin stage', async () => {
            // Prep (0) Stage
            await event.setStage(0)
            await event.setTicketToUsed(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Paused (1) Stage
            await event.setStage(1)
            await event.setTicketToUsed(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(2)
            await event.setTicketToUsed(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.setTicketToUsed(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            await event.setStage(5)
            await event.setTicketToUsed(new BN('1')).should.be.rejectedWith(EVM_REVERT)
        })

        beforeEach(async () => {
            // Set stage to Checkin Open
            await event.setStage(3)
        })
        
        it('checking ticket mark as used', async () => {
            console.log(await event.tickets(buyer2));
            await event.setTicketToUsed({ sQRCodeKey: "12345", from: buyer1 })
        })
    })
})

// Event Creator testing
contract('EventCreator', (accounts) => {
    // Variables for creating the Event Contract
    let eventCreator
    const _numTickets = 5;
    const _price = 50;
    const _canBeResold = true;
    const _royaltyPercent = 20;
    const _eventName = 'EventName'
    const _eventSymbol = 'EventSymbol'

    // Variables for users from Ganache
    const owner = accounts[0]
    const buyer1 = accounts[1]
    const buyer2 = accounts[2]

    beforeEach(async () => {
        eventCreator = await EventCreator.new()
    })

    // EventCreator Contract deployment
    describe('deployment', async () => {
        // Test address
        // it contains test examples
        it('EventCreator contract deploys successfully', async () => {
            // NOTE: can only use await inside of an async function call
            // Make sure deployed contract exists by ensuring not an empty string
            const address = eventCreator.address
            assert.notEqual(address,'')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    // Create new event
    describe('create event', async () => {
        
        it('Create event success', async () => {
            const address = await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
            assert.notEqual(address,'')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        // emitEvent
        it('Checking createEvent success, address added to events list matches emitted event address', async () => {
            let event = await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol, { from: buyer1 })
            let events = await eventCreator.getEvents()
            let eventAddress = events[0]

            truffleAssert.eventEmitted(event, 'CreateEvent', (ev) => {
                // Check Buyer Address
                const creator_expected = buyer1.toString()
                const creator_actual = ev['_creator'].toString()

                // Check Event Address
                const event_expected = eventAddress.toString()
                const event_actual = ev['_event'].toString()

                return creator_expected === creator_actual && event_expected === event_actual
            })
        })

        it('getEventCount returns correct number of events', async () => {
            const numEventsBefore = await eventCreator.getEventCount()
            assert.equal(numEventsBefore, 0, 'Starting number of events should be 0')
            
            await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
            const numEventsAfter1 = await eventCreator.getEventCount()
            assert.equal(numEventsAfter1, 1, 'The number of events should increase after adding an event')
            
            await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
            const numEventsAfter2 = await eventCreator.getEventCount()
            assert.equal(numEventsAfter2, 2, 'The number of events should increase after adding an event')
        })

        it('getEvents returns list of event addresses', async () => {
            // Note: We already checked that the event address equaled the event emitted
            eventCreator = await EventCreator.new()

            const address1 = await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
            assert.notEqual(address1,'')
            assert.notEqual(address1, 0x0)
            assert.notEqual(address1, null)
            assert.notEqual(address1, undefined)

            const address2 = await eventCreator.createEvent(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
            assert.notEqual(address2,'')
            assert.notEqual(address2, 0x0)
            assert.notEqual(address2, null)
            assert.notEqual(address2, undefined)
        })
    })

})