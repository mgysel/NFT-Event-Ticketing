const { assert } = require('chai')
const { contracts_build_directory } = require('../truffle-config')

// Import smart contract using its artifact
const Event = artifacts.require('./Event')

// Testing library
require('chai')
    .use(require('chai-as-promised'))
    .should()

// NOTE: THESE ARE SAMPLE TESTS
// accounts - the accounts from Ganache
// async - to interact with blockchain, must use async calls
contract('Event', (accounts) => {
    let contract

    beforeEach(async () => {
        contract = await Event.deployed()
    })

    // Describe is a container for test examples
    describe('deployment', async () => {
        // Test address
        // it containts test examples
        it('deploys successfully', async () => {
            // NOTE: can only use await inside of an async function call
            // Make sure deployed contract exists by ensuring not an empty string
            const address = contract.address
            assert.notEqual(address,'')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        // Test Event Name
        it('has a name', async () => {
            const name = await contract.name()
            assert.equal(name, 'EventName')
        })

        // Test Event Symbol
        it('has a symbol', async () => {
            const symbol = await contract.symbol()
            assert.equal(symbol, 'EventSymbol')
        })
    })

})