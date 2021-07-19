import React, { useState, useEffect } from 'react';
import {
  Heading,
  Flex,
  Wrap,
  WrapItem,
  Button,
  Text,
  IconButton,
  Icon,
  SimpleGrid,
  Box,
} from "@chakra-ui/react";
import Web3 from 'web3'
import './App.css';
import Event from '../abis/Event.json';
import EventCreator from '../abis/EventCreator.json'
// This function detects most providers injected at window.ethereum
// import detectEthereumProvider from '@metamask/detect-provider';


function App() {
  const [web3, setWeb3] = useState("undefined");
  const [account, setAccount] = useState("");
  const [netId, setNetId] = useState("");
  const [eventCreator, setEventCreator] = useState("");
  const [eventContracts, setEventContracts] = useState([]);
  const [eventAddresses, setEventAddresses] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [myEvents, setMyEvents] = useState([]);

  const [formEventName, setFormEventName] = useState("");
  const [formEventSymbol, setFormEventSymbol] = useState("");
  const [formNumTickets, setFormNumTickets] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCanBeResold, setFormCanBeResold] = useState("");
  const [formRoyaltyPercent, setFormRoyaltyPercent] = useState("");

  const [sRandomHash, setSRandomHash] = useState("");
  const [eventStage, setEventStage] = useState(0);

  
  // On page load, load eventCreator contract
  useEffect(() => {
    async function componentDidMount() {
      await loadEventCreator()

      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
      } else {
        window.alert('Non-Ethereum browser detected. Please install MetaMask!')
      }
    }

    componentDidMount()
  }, [])

  async function loadEventCreator() {
    if (typeof window.ethereum !== 'undefined') {
      // Connect to blockchain
      const web3 = new Web3(window.ethereum)
      setWeb3(web3)

      // User must now allow for connection
      await window.ethereum.enable()

      // Get Account, make sure there is a connection
      const accounts = await web3.eth.getAccounts()
      if (typeof accounts[0] !== 'undefined') {
        setAccount(accounts[0])
        const netId = await web3.eth.net.getId()
        setNetId(netId)

        try {
          // Load Event Creator Contract
          const thisEventCreator = new web3.eth.Contract(EventCreator.abi, EventCreator.networks[netId].address)
          setEventCreator(thisEventCreator)
  
          // Store event addresses in eventAddresses
          setEventAddresses(await thisEventCreator.methods.getEvents().call())

        } catch(e) {
          console.log('Error', e)
          window.alert('Contracts not deployed to the current network')
        }
      }
    } else {
      window.alert('Please install MetaMask')
    }
  }

  // Create event contracts and extract data after eventAddresses have been generated
  useEffect(() => {
    if (eventAddresses !== null) {
      async function createEventContracts() {
        // Create event contract from each event address, store in eventContracts
        // Get event data from each event contract, store in eventData
        var allEventContracts = []
        var allEventData = []
        for (var i = 0; i < eventAddresses.length; i++) {
          // Create event contract from event abi, address
          const thisEventContract = new web3.eth.Contract(Event.abi, eventAddresses[i])
          allEventContracts.push(thisEventContract)
          
          // Extract event data from event contract
          const thisEventData = {}
          
          thisEventData['owner'] = await thisEventContract.methods.owner().call()
          thisEventData['stage'] = await thisEventContract.methods.stage().call()
          thisEventData['eventName'] = await thisEventContract.methods.name().call()
          thisEventData['eventSymbol'] = await thisEventContract.methods.symbol().call()
          thisEventData['numTicketsLeft'] = await thisEventContract.methods.numTicketsLeft().call()
          thisEventData['price'] = await thisEventContract.methods.price().call()
          thisEventData['canBeResold'] = await thisEventContract.methods.canBeResold().call()
          thisEventData['royaltyPercent'] = await thisEventContract.methods.royaltyPercent().call()
          console.log("THIS EVENT DATA")
          console.log(thisEventData)
          allEventData.push(thisEventData)
        }

        setEventContracts(allEventContracts)
        setEventData(allEventData)
      }

      createEventContracts()
    }
  }, [eventAddresses])

  // Get user Tickets once eventData has been generated
  useEffect(() => {
    if (eventData !== null) {
      async function getUserTickets() {
        // Get user tickets for each event
        console.log("TICKET BALANCES")
        var allTickets = []
        for (var i = 0; i < eventContracts.length; i++) {
          let bal = await eventContracts[i].methods.balanceOf(account).call()
          console.log("Event Balance")
          console.log(i)
          console.log(bal['_hex']);
          allTickets.push({
            'eventNumber': i, 
            'eventName': eventData[i]['eventName'],
            'numTickets': bal['_hex']
          })
        }
        setTickets(allTickets)
      }
  
      getUserTickets()
    }
  }, [eventData])

  useEffect(() => {
    if (eventData !== null) {
      function getUserEvents() {
        console.log("INSIDE")
        console.log(eventData)
        console.log(eventData.length)
        var userEvents = []
        for (var i = 0; i < eventData.length; i++) {
          console.log("COMPARISON")
          console.log(account)
          console.log(eventData[i]['owner'])
          if (account === eventData[i]['owner']) {
            userEvents.push(eventData[i])
          }
        }
        setMyEvents(userEvents)
      }

      getUserEvents()
    }
  }, [eventData])

  // Allows user to create an event
  async function createEvent(e) {
    // Check that eventCreator
    if (eventCreator !== 'undefined') {
      try {
        console.log(account)
        await eventCreator.methods.createEvent(formNumTickets, formPrice, formCanBeResold, formRoyaltyPercent, formEventName, formEventSymbol).send({ from: account })
      
      } catch(e) {
        console.log('Create Event error: ', e)
      }
    }
  }

  // Allows user to update stage of event they created
  async function updateEventStage(e, index) {
    // Check that eventCreator
    if (eventContracts[index] !== 'undefined') {
      console.log("INSIDE UPDATE EVENT STAGE")
      console.log(index)
      console.log(eventContracts)
      console.log(eventContracts[index])
      try {
        await eventContracts[index].methods.setStage(eventStage).send({ from: account })
      } catch(e) {
        console.log('Update event stage error: ', e)
      }
    }
  }

  // Allows user to purchase ticket
  async function buyTicket(e, eventNumber) {
    
    const amount = eventData[eventNumber]['price']

    try {
      await eventContracts[eventNumber].methods.buyTicket().send({ value: amount, from: account })
    } catch(e) {
      console.log('Buy Ticket Error: ', e)
    }
  }

  // Allows user to mark ticket as used
  async function setTicketToUsed(e, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.setTicketToUsed(sRandomHash).send({ from: account })
    } catch(e) {
      console.log('Buy Ticket Error: ', e)
    }
  }

  return (
    <div>
      <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <p
          className="navbar-brand col-sm-3 col-md-2 mr-0 mb-0"
        >
          TicketChain
        </p>
      </nav>
      <div className="container-fluid mt-5">
        <div className="row">
          <main role="main" className="col-lg-12 d-flex text-center">
            <div className="content mr-auto ml-auto">
              <h1>Create an Event Now</h1>
                <form onSubmit={(e) => {
                    e.preventDefault()
                    createEvent(e)
                }}>
                <div className='form-group mr-sm-2'>
                <br></br>
                  <input
                    id='name'
                    type='text'
                    className="form-control form-control-md mb-2"
                    placeholder='Event name'
                    onChange={(e) => setFormEventName(e.target.value)}
                  />
                  <input
                    id='symbol'
                    type='text'
                    className="form-control form-control-md mb-2"
                    placeholder='Token symbol'
                    onChange={(e) => setFormEventSymbol(e.target.value)}
                  />
                  <input
                    id='numTickets'
                    type='number'
                    className="form-control form-control-md mb-2"
                    placeholder='Number of Tickets'
                    onChange={(e) => setFormNumTickets(e.target.value)}
                  />
                  <input
                    id='price'
                    type='number'
                    className="form-control form-control-md mb-2"
                    placeholder='Price'
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                  <input
                    id='canBeResold'
                    type='text'
                    className="form-control form-control-md mb-2"
                    placeholder='Can the Tickets be resold?'
                    onChange={(e) => setFormCanBeResold(e.target.value)}
                  />
                  <input
                    id='royaltyPercent'
                    type='number'
                    className="form-control form-control-md mb-2"
                    placeholder='Resale royalty (%)'
                    onChange={(e) => setFormRoyaltyPercent(e.target.value)}
                  />
                </div>
                <button type='submit' className='btn btn-primary mb-4'>CREATE EVENT</button>
              </form>
            </div>
          </main>
        </div>
      </div>
      <div div className="content mr-auto ml-auto">
        <h1 className="text-center" pb="30px">All Events</h1>
        <SimpleGrid columns={4} spacing={10}>
          { 
            eventData.map((id, index) => (
                <Box key={index} border="1px solid black" p="20px" width="20rem">
                  <Text isTruncated fontWeight="bold"> Event {index + 1}</Text>
                  <Text>Name: {id.eventName}</Text>
                  <Text>Symbol: {id.eventSymbol}</Text>
                  <Text>Stage: {id.stage}</Text>
                  <button className='btn btn-primary mb-4' onClick={(e) => {
                    e.preventDefault()
                    buyTicket(e, index)
                  }}>
                    Buy Ticket
                  </button>
                </Box>
            ))
          }
        </SimpleGrid>
      </div>
      <div div className="content mr-auto ml-auto">
        <h1 className="text-center" pb="30px">My Tickets</h1>
        <SimpleGrid columns={4} spacing={10}>
          { 
            tickets.map((id, index) => (
                <Box key={index} border="1px solid black" p="20px" width="20rem">
                  <Text isTruncated fontWeight="bold"> Event {index + 1}</Text>
                  <Text>Event: {id.eventName}</Text>
                  <Text>Number of Tickets: {id.numTickets}</Text>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    setTicketToUsed(e, index)
                  }}>
                    <div className='form-group mr-sm-2'>
                      <input
                        id='eventStage'
                        type='number'
                        className="form-control form-control-md mb-2"
                        placeholder='Set SRandomHash'
                        onChange={(e) => setSRandomHash(e.target.value)}
                      />
                    </div>
                    <button type='submit' className='btn btn-primary mb-4'>Set Ticket To Used</button>
                  </form>
                </Box>

            ))
          }
        </SimpleGrid>
      </div>
      <div div className="content mr-auto ml-auto">
        <h1 className="text-center" pb="30px">My Events</h1>
        <SimpleGrid columns={4} spacing={10}>
          { 
            myEvents.map((id, index) => (
              <Box key={index} border="1px solid black" p="20px" width="20rem">
                <Text isTruncated fontWeight="bold"> Event {index + 1}</Text>
                <Text>Event: {id.eventName}</Text>
                <Text>Number of Tickets: {id.numTickets}</Text>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  updateEventStage(e, index)
                }}>
                  <div className='form-group mr-sm-2'>
                    <input
                      id='eventStage'
                      type='number'
                      className="form-control form-control-md mb-2"
                      placeholder='Set Event Stage (Prep, Active, Paused, CheckinOpen, Cancelled, Closed)'
                      onChange={(e) => setEventStage(e.target.value)}
                    />
                  </div>
                  <button type='submit' className='btn btn-primary mb-4'>Set Event Stage</button>
                </form>
              </Box>
            ))
          }
        </SimpleGrid>
      </div>
    </div>
  );
}

export default App;
