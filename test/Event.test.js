const { assert, expect } = require('chai')
const { truffleAssert } = require('truffle-assertions');
const { contracts_build_directory } = require('../truffle-config')
import Web3 from 'web3'

// Import smart contract using its artifact
const Event = artifacts.require('./Event')

// Testing library
require('chai')
    .use(require('chai-as-promised'))
    .should()


// NOTE: ETHEREUM STORES BIG NUMBERS THAT JS CANNOT COMPILE,
// FOLLOW THE describe('comparison') EXAMPLES FOR HOW TO COMPARE NUMBERS
// accounts - the accounts from Ganache
// async - to interact with blockchain, must use async calls
contract('Event', (accounts) => {
    // Variables for creating the Event Contract
    let contract
    const numTickets = 500;
    const price = 50;
    const canBeResold = true;
    const royaltyPercent = 20;
    const eventName = 'EventName'
    const eventSymbol = 'EventSymbol'

    // Variables for users from Ganache
    const owner = accounts[0]
    const buyer1 = accounts[1]
    const buyer2 = accounts[2]


    beforeEach(async () => {
        contract = await Event.new(numTickets, price, canBeResold, royaltyPercent, eventName, eventSymbol)
        contract = await Event.deployed()
    })

    // Describe is a container for test examples
    describe('deployment', async () => {
        // Test address
        // it containts test examples
        it('Event contract deploys successfully', async () => {
            // NOTE: can only use await inside of an async function call
            // Make sure deployed contract exists by ensuring not an empty string
            const address = contract.address
            assert.notEqual(address,'')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        // Test Event Name
        it('checking event name', async () => {
            expect(await contract.name()).to.be.eq('EventName')
        })

        // Test Event Symbol
        it('checking event symbol', async () => {
            expect(await contract.symbol()).to.be.eq('EventSymbol')
        })
    })

    describe('constructor', async () => {
        it('checking smart contract owner', async () => {
            // Check that SC owner is first account from Ganache
            expect(await contract.owner()).to.be.eq(owner)
        })

        it('checking numTicketsLeft set correctly', async () => {
            const expected = web3.utils.toBN('500')
            const numTicketsLeft = await contract.numTicketsLeft()
            expect(numTicketsLeft).to.eql(expected)
        })

        it('checking price set correctly', async () => {
            const expected = web3.utils.toBN('50')
            const price = await contract.price()
            expect(price).to.eql(expected)
        })

        it('checking canBeResold set correctly', async () => {
            // Get first account from Ganache
            expect(await contract.canBeResold()).to.be.eq(true)
        })

        it('checking royaltyPercent set correctly', async () => {
            // Get first account from Ganache
            const expected = web3.utils.toBN('20')
            const royalty = await contract.royaltyPercent()
            expect(royalty).to.eql(expected)
        })
    })

    describe('buyTicket', async () => {
        // Buy Ticket Success
        it('checking buyTicket', async () => {
            // // Get first account from Ganache
            // const accounts = await web3.eth.getAccounts()
            // const owner = accounts[0]
            // // Check that SC owner is first account from Ganache
            // expect(await contract.owner()).to.be.eq(owner)

            const ticket1 = await contract.buyTicket({ value: 100, from: buyer1 })
            console.log(ticket1)
            truffleAssert.eventEmitted(ticket1, 'CreateTicket', (event) => {
                expect(event.owner).to.be.eq(buyer1)
                expect(event.ticketId).to.be.eq(1)
            })
        })

        // Not enough money

        // Not enough tickets left

        // numTicketsLeft Decrements
    })
})