const { assert, expect } = require('chai')
const BN = require('bn.js')
const { contracts_build_directory } = require('../truffle-config')
const truffleAssert = require('truffle-assertions')
import Web3 from 'web3'

const EVM_REVERT = 'VM Exception while processing transaction: revert'

// Import smart contract using its artifact
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
    let event
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
        event = await Event.new(_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
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

        // Test Event Name
        it('checking event name', async () => {
            expect(await event.name()).to.be.eq('EventName')
        })

        // Test Event Symbol
        it('checking event symbol', async () => {
            expect(await event.symbol()).to.be.eq('EventSymbol')
        })
    })

    describe('constructor', async () => {
        it('checking smart contract owner', async () => {
            // Check that SC owner is first account from Ganache
            expect(await event.owner()).to.be.eq(owner)
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
            expect(await event.canBeResold()).to.be.eq(true)
        })

        it('checking royaltyPercent set correctly', async () => {
            // Get first account from Ganache
            const expected = web3.utils.toBN(_royaltyPercent)
            const royalty = await event.royaltyPercent()
            expect(royalty).to.eql(expected)
        })

    })

    describe('buyTicket', async () => {

        it('checking cannot buy ticket unless active stage', async () => {
            // Prep (0) Stage
            event.setStage(0)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            event.setStage(2)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            event.setStage(4)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            event.setStage(5)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

        beforeEach(async () => {
            // Set stage to active
            event.setStage(1)
        })

        // Buy Ticket Success
        it('checking buyTicket', async () => {
            let ticket1 = await event.buyTicket({ value: _price, from: buyer1 })
            // NOTE: Inside truffleAssert, we have to return results
            truffleAssert.eventEmitted(ticket1, 'CreateTicket', (ev) => {
                // Check buyer address
                const address_expected = buyer1.toString()
                const address_actual = ev['buyer'].toString()

                // Check ticketID
                const ticketID_expected = '1'
                const ticketID_actual = ev['ticketID'].toString()

                return ticketID_actual === ticketID_expected && address_actual === address_expected
            })
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
            await event.buyTicket({ value: (_price), from: buyer1 }) 
            await event.buyTicket({ value: (_price), from: buyer1 })   
            await event.buyTicket({ value: (_price), from: buyer1 })
            await event.buyTicket({ value: (_price), from: buyer1 })
            await event.buyTicket({ value: (_price), from: buyer1 })
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

    })
})