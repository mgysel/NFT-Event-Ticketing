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

        it('checking contract owner set correctly', async () => {
            // Get first account from Ganache
            const expected = owner
            const actual = await event.owner()
            expect(actual).to.eql(expected)
        })

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


        // TODO: constructor arguments are valid (this should make sure no overflow)
        it('invalid constructor arguments', async() => {
            // Owner must be address
            const invalidNumTickets = 0
            await Event.new(owner, invalidNumTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol).should.be.rejectedWith(EVM_REVERT)

            const invalidRoyaltyPercent = 101 
            await Event.new(owner, _numTickets, _price, _canBeResold, invalidRoyaltyPercent, _eventName, _eventSymbol).should.be.rejectedWith(EVM_REVERT)

            const invalidEventName = ''
            await Event.new(owner, _numTickets, _price, _canBeResold, _royaltyPercent, invalidEventName, _eventSymbol).should.be.rejectedWith(EVM_REVERT)

            const invalidEventSymbol = ''
            await Event.new(owner, _numTickets, _price, _canBeResold, _royaltyPercent, _eventName, invalidEventSymbol).should.be.rejectedWith(EVM_REVERT)
        })


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
        
        // it('checking ticket mark as used', async () => {
        //     console.log("GET BUYER 1 TICKETS BEFORE")
        //     console.log(await event.tickets(buyer1));
        //     await event.buyTicket({ value: (_price), from: buyer1 }) 
        //     console.log("GET BUYER 1 TICKETS AFTER")
        //     console.log(await event.tickets(buyer1));
        //     const qrCode = await event.setTicketToUsed({ sQRCodeKey: "12345", from: buyer1 })
        //     // console.log("QR CODE")
        //     // console.log(qrCode)
        // })
    })

    describe('withdraw', async () => {

        beforeEach(async () => {
            // Set stage to active
            await event.setStage(1)
        })

        it('user can withdraw money after ticket overpay', async () => {
            // Overpay for ticket
            const overpay = 1e10;
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            
            // Check user SC balance before and after withdraw
            const beforeSC = parseInt(await event.balances(buyer1))
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            
            const receipt = await event.withdraw({ from: buyer1 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterSC = parseInt(await event.balances(buyer1))
            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(overpay))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 
            // Check user's SC balance before and after withdraw
            assert.equal(afterSC + overpay, beforeSC, 'Customer balance should be updated after withdraw')
        })

        it('user cannot withdraw money if did not overpay for ticket and event not cancelled or paused', async () => {
            await event.buyTicket({ value: _price, from: buyer1 })
            await event.withdraw({ from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('user cannot withdraw before buying ticket', async () => {
            await event.withdraw({ from: buyer2 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('user cannot withdraw money multiple times', async () => {
            const overpay = 100
            await event.buyTicket({ value: (_price + overpay), from: buyer3 })
            await event.withdraw({ from: buyer3 })

            await event.withdraw({ from: buyer3 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('withdraw when event cancelled and no ticket overpay', async () => {
            // Buy ticket
            await event.buyTicket({ value: _price, from: buyer1 })
            
            // Event cancelled
            await event.setStage(4)

            // Check user SC balance before and after withdraw
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            
            const receipt = await event.withdraw({ from: buyer1 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(_price))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 

        })

        it('withdraw when event paused and no ticket overpay', async () => {
            // Buy ticket
            await event.buyTicket({ value: _price, from: buyer1 })
            
            // Event paused
            await event.setStage(2)

            // Check user SC balance before and after withdraw
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            
            const receipt = await event.withdraw({ from: buyer1 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(_price))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 

        })

        it('withdraw when event cancelled and ticket overpay', async () => {
            // Buy ticket
            const overpay = 1e10
            await event.buyTicket({ value: (_price + overpay), from: buyer2 })
            
            // Event cancelled
            await event.setStage(4)

            // Check user SC balance before and after withdraw
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer2))
            
            const receipt = await event.withdraw({ from: buyer2 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer2))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(_price)).add(web3.utils.toBN(overpay))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 
        })

        it('withdraw when event paused and ticket overpay', async () => {
            // Buy ticket
            const overpay = 1e10
            await event.buyTicket({ value: (_price + overpay), from: buyer2 })
            
            // Event paused
            await event.setStage(2)

            // Check user SC balance before and after withdraw
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer2))
            
            const receipt = await event.withdraw({ from: buyer2 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer2))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(_price)).add(web3.utils.toBN(overpay))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 
        })

        it('withdraw after owner withdraw', async () => {
            // Buy tickets
            const overpay = 1e10
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            await event.buyTicket({ value: (_price + overpay), from: buyer2 })
            
            // Event paused
            await event.setStage(5)

            // Check user SC balance before and after withdraw
            const beforeUser1 = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            const beforeUser2 = web3.utils.toBN(await web3.eth.getBalance(buyer2))
            const beforeOwner = web3.utils.toBN(await web3.eth.getBalance(owner))

            // Owner withdraw
            var receipt = await event.ownerWithdraw({ from: owner })
            var gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            var tx = await web3.eth.getTransaction(receipt.tx)
            var gasPrice = web3.utils.toBN(tx.gasPrice)
            var txFee = gasPrice.mul(gasUsed);
            const afterOwner = web3.utils.toBN(await web3.eth.getBalance(owner))
            const beforeOwnerAddDiff = beforeOwner.sub(txFee).add(web3.utils.toBN(_price * 2))

            // Buyer 1 withdraw
            receipt = await event.withdraw({ from: buyer1 })
            gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            tx = await web3.eth.getTransaction(receipt.tx)
            gasPrice = web3.utils.toBN(tx.gasPrice)
            txFee = gasPrice.mul(gasUsed);
            const afterUser1 = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            const beforeUser1AddDiff = beforeUser1.sub(txFee).add(web3.utils.toBN(overpay))

            // Buyer 2 withdraw
            receipt = await event.withdraw({ from: buyer2 })
            gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            tx = await web3.eth.getTransaction(receipt.tx)
            gasPrice = web3.utils.toBN(tx.gasPrice)
            txFee = gasPrice.mul(gasUsed);
            const afterUser2 = web3.utils.toBN(await web3.eth.getBalance(buyer2))
            const beforeUser2AddDiff = beforeUser2.sub(txFee).add(web3.utils.toBN(overpay))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser1.toString(), beforeUser1AddDiff.toString(), 'Owner withdraw should only give owner price of 2 tickets') 
            assert.equal(afterUser1.toString(), beforeUser1AddDiff.toString(), 'Buyer 1 withdraw should give user amount overpaid for ticket') 
            assert.equal(afterUser2.toString(), beforeUser2AddDiff.toString(), 'Buyer 2 withdraw should give user amount overpaid for ticket') 
        })

        // TODO: withdraw multiple tickets

        it('event emitted when user withdraws money', async () => {
            const overpay = 100
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            const withdraw = await event.withdraw({ from: buyer1 })

            truffleAssert.eventEmitted(withdraw, 'WithdrawMoney', (ev) => {
                // Check receiver address
                const receiver_expected = buyer1.toString()
                const receiver_actual = ev['receiver'].toString()

                // Checking money refuned
                const money_expected = overpay.toString()
                const money_actual = ev['money'].toString()

                return money_actual === money_expected && receiver_actual === receiver_expected
            })
        })

    })

    describe('owner withdraw', async () => {

        // Non-owner cannot withdraw money
        it('non-owner cannot withdraw money', async () => {
            await event.ownerWithdraw({ from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })
        
        // Owner cannot withdraw money if stage is not closed 
        it('owner cannot withdraw money if stage is not closed', async () => {
            // Prep (0) Stage
            await event.setStage(0)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
            // Active (1) Stage
            await event.setStage(1)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(2)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
            // Checkin Open (3) Stage
            await event.setStage(3)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
        })

        it('owner cannot withdraw money if no money in account', async () => {
            await event.setStage(5)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
        })

        // Owner withdraw money after tickets purchased
        it('owner successfully withdraws money', async () => {
            // User buys ticket
            await event.setStage(1)
            await event.buyTicket({ value: _price, from: buyer2 })
            
            // Event closed
            await event.setStage(5)

            // Check user SC balance before and after withdraw
            const beforeSC = parseInt(await web3.eth.getBalance(event.address))
            const beforeOwner = web3.utils.toBN(await web3.eth.getBalance(owner))
            
            const receipt = await event.ownerWithdraw({ from: owner })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterSC = parseInt(await web3.eth.getBalance(event.address))
            const afterOwner = web3.utils.toBN(await web3.eth.getBalance(owner))

            const beforeOwnerAddDiff = beforeOwner.sub(txFee).add(web3.utils.toBN(_price))

            // Check user's own account balance before and after withdraw
            assert.equal(beforeSC, _price, 'Smart contract balance not correct after user buys ticket')
            assert.equal(afterSC, 0, 'Smart contract balance not correct after owner withdraws')
            assert.equal(afterOwner.toString(), beforeOwnerAddDiff.toString(), 'Owner should withdraw correct amount') 
        })

        // Owner withdraw money after tickets purchased
        it('owner cannot withdraw twice', async () => {
            // User buys ticket
            await event.setStage(1)
            await event.buyTicket({ value: _price, from: buyer2 })
            
            // Event closed
            await event.setStage(5)
            
            await event.ownerWithdraw({ from: owner })
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
        })

        // Owner can only withdraw money from tickets purchased, not ticket overpay
        it('owner successfully withdraws money with ticket overpay', async () => {
            // User buys ticket
            await event.setStage(1)
            const overpay = 50
            await event.buyTicket({ value: (_price + overpay), from: buyer2 })
            
            // Event closed
            await event.setStage(5)

            // Check user SC balance before and after withdraw
            const beforeSC = parseInt(await web3.eth.getBalance(event.address))
            const beforeOwner = web3.utils.toBN(await web3.eth.getBalance(owner))
            
            const receipt = await event.ownerWithdraw({ from: owner })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterSC = parseInt(await web3.eth.getBalance(event.address))
            const afterOwner = web3.utils.toBN(await web3.eth.getBalance(owner))

            const beforeOwnerAddDiff = beforeOwner.sub(txFee).add(web3.utils.toBN(_price))

            // Check smart contract account balance before and after owner withdraw
            assert.equal(beforeSC, (_price + overpay), 'Smart contract balance not correct after user buys ticket')
            assert.equal(afterSC, overpay, 'Smart contract balance not correct after owner withdraws')
            // Check owner's account balance before and after withdraw
            assert.equal(afterOwner.toString(), beforeOwnerAddDiff.toString(), 'Owner should withdraw correct amount') 
        })

        // Selfdestruct?

        // Withdraw money emits event
        it('event emitted when owner withdraws money', async () => {
            await event.setStage(1)
            await event.buyTicket({ value: _price, from: buyer2 })
            await event.setStage(5)
            const withdraw = await event.ownerWithdraw({ from: owner })

            truffleAssert.eventEmitted(withdraw, 'OwnerWithdrawMoney', (ev) => {
                // Check receiver address
                const owner_expected = owner.toString()
                const owner_actual = ev['owner'].toString()

                // Checking money refuned
                const money_expected = _price.toString()
                const money_actual = ev['money'].toString()

                return money_actual === money_expected && owner_actual === owner_expected
            })
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