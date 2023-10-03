const { assert, expect } = require('chai');
const BN = require('bn.js');
const { contracts_build_directory } = require('../truffle-config');
const truffleAssert = require('truffle-assertions');
const web3 = require('web3');

const EVM_REVERT = 'VM Exception while processing transaction: revert'

// Import smart contract using its artifact
const Event = artifacts.require('./Event')
const EventCreator = artifacts.require('./Event')

// Testing library
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

// NOTE: ETHEREUM STORES BIG NUMBERS THAT JS CANNOT COMPILE,
// FOLLOW THE describe('comparison') EXAMPLES FOR HOW TO COMPARE NUMBERS
// accounts - the accounts from Ganache
// async - to interact with blockchain, must use async calls
describe('Event', (accounts) => {
    // Variables for creating the Event Contract
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
        event = await Event.new(owner,_numTickets, _price, _canBeResold, _royaltyPercent, _eventName, _eventSymbol)
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
            // enum Stages { Prep, Active, Paused, CheckinOpen, Cancelled, Closed }
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
                const ticketID_expected = '0'
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
        
        it('checking balances of owner increases after ticket purchase', async () => {
            let balanceBefore = parseInt(await event.balances(owner))
            const overpay = 1e10;
            let ticket1 = await event.buyTicket({ value: _price + overpay, from: buyer1 })
            let balanceAfter = parseInt(await event.balances(owner))

            expect(parseInt(balanceBefore) + _price).to.eql(parseInt(balanceAfter))

        })
        
        it('checking balances of buyer increases after overpay', async () => {
            let balanceBefore = parseInt(await event.balances(buyer1))
            const overpay = 1e10;
            let ticket1 = await event.buyTicket({ value: _price + overpay, from: buyer1 })
            let balanceAfter = parseInt(await event.balances(buyer1))

            expect(parseInt(balanceBefore) + overpay).to.eql(parseInt(balanceAfter))

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
            await event.setTicketToUsed(new BN('1'), new BN('2')).should.be.rejectedWith(EVM_REVERT)
            // Paused (1) Stage
            await event.setStage(1)
            await event.setTicketToUsed(new BN('1'), new BN('2')).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(2)
            await event.setTicketToUsed(new BN('1'), new BN('2')).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.setTicketToUsed(new BN('1'), new BN('2')).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            await event.setStage(5)
            await event.setTicketToUsed(new BN('1'), new BN('2')).should.be.rejectedWith(EVM_REVERT)
        })

        beforeEach(async () => {
            // Set stage to Checkin Open
            await event.setStage(1)
            await event.buyTicket({ value: (_price), from: buyer1 })
            await event.setStage(3)
        })
        
        it('checking ticket mark as used', async () => {
            let ticketID = 0
            let sQRCodeKey = "12345"
            let t = await event.setTicketToUsed(ticketID, sQRCodeKey, { from: buyer1 })
            truffleAssert.eventEmitted(t, 'TicketUsed', (ev) => {
                const sQRexpected = "12345"
                const sQRactual = ev['sQRCodeKey'].toString()
                return sQRactual === sQRexpected
            })
        })

        it('confirm ticket set to used', async() => {
            let ticketID = 0
            let sQRCodeKey = "12345"
            await event.setTicketToUsed(ticketID, sQRCodeKey, { from: buyer1 })
            let x = await event.getTicketStatus(ticketID, { from: buyer1 })
            assert.equal(x.valueOf(), 1, 'ticket should be used')
        })
    })

    describe('setTicketForSale', async () => {

        it('checking cannot set Ticket For Sale unless Active stage', async () => {
            // Prep (0) Stage
            await event.setStage(0)
            let ticketID = 0
            let ticketPrice = 100
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Paused (1) Stage
            await event.setStage(2)
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(3)
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            await event.setStage(5)
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })
        beforeEach(async () => {
            // Set stage to Active
            await event.setStage(1)
            await event.buyTicket({ value: (_price), from: buyer1 })
        })
        
        it('checking ticket mark as available for sale', async () => {
            let ticketID = 0
            let ticketPrice = 100
            let e = await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            truffleAssert.eventEmitted(e, 'TicketForSale', (ev) => {
                let ticketID_expected = '0'
                let ticketID_actual = ev['ticketID'].toString()

                return ticketID_actual === ticketID_expected
            })
        })

        it('confirm ticket available for sale', async() => {
            let ticketID = 0
            let ticketPrice = 100
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            let x = await event.getTicketStatus(ticketID, { from: buyer1 })
            assert.equal(x.valueOf(), 2, 'ticket should be available for sale')
        })

        it('checking cannot set for sale if used', async () => {
            let ticketID = 0
            let ticketPrice = 100
            let sQRCodeKey = "12345"
            await event.setStage(3)
            await event.setTicketToUsed(ticketID, sQRCodeKey, { from: buyer1 })
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('Buy Ticket from User', async () => {
        it('checking cannot buy ticket from user unless stage active', async () => {
            await event.setStage(0)
            await event.buyTicketFromUser(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Paused (1) Stage
            await event.setStage(2)
            await event.buyTicketFromUser(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Paused (2) Stage
            await event.setStage(3)
            await event.buyTicketFromUser(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Cancelled (4) Stage
            await event.setStage(4)
            await event.buyTicketFromUser(new BN('1')).should.be.rejectedWith(EVM_REVERT)
            // Closed (5) Stage
            await event.setStage(5)
            await event.buyTicketFromUser(new BN('1')).should.be.rejectedWith(EVM_REVERT)
        })

        beforeEach(async () => {
            await event.setStage(1)
            await event.buyTicket({ value: (_price), from: buyer1 })
        })

        it('set ticket for sale', async () => {
            let ticketID = 0
            let ticketPrice = 100
            let e = await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            let x = await event.getTicketStatus(ticketID, { from: buyer1 })
            assert.equal(x.valueOf(), 2, 'ticket should be available for sale')
        })

        it('buy ticket from buyer 1', async () => {
            let ticketID = 0
            let ticketPrice = 100
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            await event.approveAsBuyer(buyer2, ticketID, { from: buyer1 })
            let t  = await event.buyTicketFromUser(ticketID, { value: (ticketPrice), from: buyer2 })
            truffleAssert.eventEmitted(t, 'TicketSold', (ev) => {

                let buyer_expected = buyer2
                let buyer_actual = ev['buyer'].toString()

                let ticketID_expected = '0'
                let ticketID_actual = ev['ticketID'].toString()

                return buyer_actual == buyer_expected && ticketID_actual == ticketID_expected
            })
        })

        it('ticket should belong to buyer 2', async () => {
            let ticketID = 0
            let ticketPrice = 100
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            await event.approveAsBuyer(buyer2, ticketID, { from: buyer1 })
            await event.buyTicketFromUser(ticketID, { value: (_price), from: buyer2 })
            let newTicketOwner = await event.ownerOf(ticketID)
            assert.equal(newTicketOwner.valueOf(), buyer2, "Owner should be buyer 2")
        })

        it('checking buyer 2 recieves NFT after buying ticket from buyer 1', async () => {
            let bal = await event.balanceOf(buyer2, { from: buyer2 })
            assert.equal(bal, 0, 'Buyer 2 should have 0 NFTs before purchasing any tickets')

            await event.buyTicket({ value:(_price), from: buyer1 })
            let ticketID = 0
            let ticketPrice = 100
            await event.setTicketForSale(ticketID, ticketPrice, { from: buyer1 })
            await event.approveAsBuyer(buyer2, ticketID, { from: buyer1 })
            await event.buyTicketFromUser(ticketID, { value: (_price), from: buyer2 })
            bal = await event.balanceOf(buyer2, { from: buyer2 })
            assert.equal(bal, 1, "Buyer 2 should have 1 NFT after buying ticket from buyer1")
        })
    })
    
    describe('user withdraw if event is not cancelled', async () => {

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
            assert.equal(afterSC,  0, 'Customer balances should be 0 after withdraw')
        })

        it('user cannot withdraw money if did not overpay for ticket', async () => {
            await event.buyTicket({ value: _price, from: buyer1 })
            await event.withdraw({ from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('user cannot withdraw before buying ticket', async () => {
            await event.withdraw({ from: buyer2 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('user cannot withdraw money if user already withdraw all', async () => {
            const overpay = 100
            await event.buyTicket({ value: (_price + overpay), from: buyer3 })
            await event.withdraw({ from: buyer3 })

            await event.withdraw({ from: buyer3 }).should.be.rejectedWith(EVM_REVERT)
        })
        
        it('user can withdraw money in paused stage after ticket overpay', async () => {
            // Overpay for ticket
            const overpay = 1e10;
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            
            await event.setStage(2)
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
            assert.equal(afterSC,  0, 'Customer balances should be 0 after withdraw')
        })
        
        it('user can withdraw money in checkinOpen stage after ticket overpay', async () => {
            // Overpay for ticket
            const overpay = 1e10;
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            
            await event.setStage(3)
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
            assert.equal(afterSC,  0, 'Customer balances should be 0 after withdraw')
        })
        
        it('user can withdraw money in closed stage after ticket overpay', async () => {
            // Overpay for ticket
            const overpay = 1e10;
            await event.buyTicket({ value: (_price + overpay), from: buyer1 })
            
            await event.setStage(5)
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
            assert.equal(afterSC,  0, 'Customer balances should be 0 after withdraw')
        })

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

    describe('owner withdraw if event is not cancelled', async () => {

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
            // Overpay for ticket
            const overpay = 1e10;
            await event.buyTicket({ value: _price + overpay, from: buyer2 })
            
            // Event closed
            await event.setStage(5)

            // Check user SC balance before and after withdraw
            const beforeSC = parseInt(await event.balances(owner))
            const beforeOwner = web3.utils.toBN(await web3.eth.getBalance(owner))
            
            const receipt = await event.ownerWithdraw({ from: owner })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);

            const afterSC = parseInt(await event.balances(owner))
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
    
    // event cancelled case all go in here
    describe('event cancelled', async () => {
        
        beforeEach(async () => {
            // Set stage to active
            await event.setStage(1)
        })
        
        it('owner withdraws money after event cancelled without royalty gain', async () => {
            // user 1 buy two tickets with overpay
            const overpay = 1e10
            await event.buyTicket({ value: _price + overpay, from: buyer1 })
            await event.buyTicket({ value: _price, from: buyer1 })
            
            // Event closed
            await event.setStage(4)
            await event.setStage(5)

            // Check user SC balance before and after withdraw
            const beforeSC = parseInt(await event.balances(owner))
            // Check user's own account balance before and after withdraw
            assert.equal(beforeSC, 0, 'Smart contract balance not correct after user buys ticket')
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
            
            
        })
        
        it('event reverted when owner withdraws money if event cancelled without royalty gain', async () => {
            const overpay = 1e10
            await event.buyTicket({ value: _price + overpay, from: buyer2 })
            await event.buyTicket({ value: _price, from: buyer2 })
            
            await event.setStage(4)
            await event.setStage(5)
            
            await truffleAssert.reverts(event.ownerWithdraw({ from: owner }), 'No money to withdraw')
        })
        
        it('user withdraw when event cancelled and with ticket overpay', async () => {
            // user 1 buy two tickets with overpay
            const overpay = 1e10
            await event.buyTicket({ value: _price + overpay, from: buyer1 })
            await event.buyTicket({ value: _price, from: buyer1 })
            
            // Event cancelled
            await event.setStage(4)
            // Check user SC balance before and after withdraw
            const beforeUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))
            const beforeSC = parseInt(await event.balances(buyer1))
            
            const receipt = await event.withdraw({ from: buyer1 })
            const gasUsed = web3.utils.toBN(receipt.receipt.gasUsed)
            const tx = await web3.eth.getTransaction(receipt.tx)
            const gasPrice = web3.utils.toBN(tx.gasPrice)
            const txFee = gasPrice.mul(gasUsed);
            const afterSC = parseInt(await event.balances(buyer1))
            const afterUser = web3.utils.toBN(await web3.eth.getBalance(buyer1))

            const beforeUserAddDiff = beforeUser.sub(txFee).add(web3.utils.toBN(_price)).add(web3.utils.toBN(_price)).add(web3.utils.toBN(overpay))

            // Check user's own account balance before and after withdraw
            assert.equal(afterUser.toString(), beforeUserAddDiff.toString(), 'Customer account should be refunded after withdraw') 
            // Check user's SC balance before and after withdraw
            assert.equal(beforeSC, overpay, 'Customer balance should be overpay value before withdraw')
            assert.equal(afterSC,  0, 'Customer balances should be 0 after withdraw')
            
        })
        
        it('event emitted when user withdraws money', async () => {
            const overpay = 100
            await event.buyTicket({ value: (_price ), from: buyer2 })
            await event.buyTicket({ value: (_price + overpay), from: buyer2 })
            
            // Event cancelled
            await event.setStage(4)
            const withdraw = await event.withdraw({ from: buyer2 })
    
            truffleAssert.eventEmitted(withdraw, 'WithdrawMoney', (ev) => {
                // Check receiver address
                const receiver_expected = buyer2.toString()
                const receiver_actual = ev['receiver'].toString()
    
                // Checking money refuned
                const money_expected = (overpay + _price + _price).toString()
                const money_actual = ev['money'].toString()
    
                return money_actual === money_expected && receiver_actual === receiver_expected
            })
        })
        
        it('checking cannot buy ticket in cancelled stage', async () => {
            // Event cancelled
            await event.setStage(4)
            await event.buyTicket({ value: (_price), from: buyer1 }).should.be.rejectedWith(EVM_REVERT)
        })
        
        it('checking owner cannot withdraw money if stage is cacelled', async () => {
            await event.setStage(4)
            await event.ownerWithdraw({ from: owner }).should.be.rejectedWith(EVM_REVERT)
        })
        
        it('checking cannot set Ticket To Used unless Checkin stage', async () => {
            // Event cancelled
            await event.setStage(4)
            await event.setTicketToUsed(0,new BN('1')).should.be.rejectedWith(EVM_REVERT)
        })
        
        
        
    })
})

// Event Creator testing
describe('EventCreator', (accounts) => {
    // Variables for creating the Event Contract
    let eventCreator
    const _numTickets = 5
    const _price = 50
    const _canBeResold = true
    const _royaltyPercent = 20
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