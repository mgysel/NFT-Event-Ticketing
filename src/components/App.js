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
  //const [web3, setWeb3] = useState("undefined");
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(0);
  const [eventCreator, setEventCreator] = useState("");
  const [eventCreatorAddress, setEventCreatorAddress] = useState("");
  const [eventContracts, setEventContracts] = useState([]);
  const [eventAddresses, setEventAddresses] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [thisEventData, setThisEventData] = useState("Placeholder");
  const [tickets, setTickets] = useState([]);
  const [thisTicket, setThisTicket] = useState("Placeholder");

  const [formEventName, setFormEventName] = useState("");
  const [formEventSymbol, setFormEventSymbol] = useState("");
  const [formNumTickets, setFormNumTickets] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCanBeResold, setFormCanBeResold] = useState("");
  const [formRoyaltyPercent, setFormRoyaltyPercent] = useState("");

  
  // Connect app to blockchain with web3
  // componentWillMount always gets called when this component gets attached to DOM
  useEffect(() => {
    async function componentDidMount() {
      //await this.loadWeb3()
      await loadBlockchainData()
      //await this.getEvents()

      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
      } else {
        window.alert('Non-Ethereum browser detected. Please install MetaMask!')
      }
    }

    componentDidMount()
  }, [])

  async function loadBlockchainData() {
    if (typeof window.ethereum !== 'undefined') {
      // Connect to blockchain
      const web3 = new Web3(window.ethereum)
      console.log("WEB3")
      console.log(web3)

      // User must now allow for connection
      await window.ethereum.enable()

      // Get Account, make sure there is a connection
      const accounts = await web3.eth.getAccounts()
      if (typeof accounts[0] !== 'undefined') {
        const netId = await web3.eth.net.getId()
        const balance = await web3.eth.getBalance(accounts[0])
        console.log("NETID")
        console.log(netId)
        setAccount(accounts[0])
        //setWeb3(web3)
        setBalance(balance)

        // Load Event Creator
        try {
          const eventCreator = new web3.eth.Contract(EventCreator.abi, EventCreator.networks[netId].address)
          setEventCreator(eventCreator)
  
          // Store event addresses in eventAddresses
          const eventAddresses = await eventCreator.methods.getEvents().call()
          console.log("EVENT ADDRESSES")
          console.log(eventAddresses)
          setEventAddresses(eventAddresses)

          // Create event contract from each event address, store in eventContracts
          // Get event data from each event contract, store in eventData
          for (var i = 0; i < eventAddresses.length; i++) {
            console.log(eventAddresses[i])
            const thisEventContract = new web3.eth.Contract(Event.abi, eventAddresses[i])
            eventContracts.push(thisEventContract)

            const thisEventData = {}
            thisEventData['eventName'] = await thisEventContract.methods.name().call()
            thisEventData['eventSymbol'] = await thisEventContract.methods.symbol().call()
            thisEventData['numTicketsLeft'] = await thisEventContract.methods.numTicketsLeft().call()
            thisEventData['price'] = await thisEventContract.methods.price().call()
            thisEventData['canBeResold'] = await thisEventContract.methods.canBeResold().call()
            thisEventData['royaltyPercent'] = await thisEventContract.methods.royaltyPercent().call()
            console.log("THIS EVENT DATA")
            console.log(thisEventData)
            eventData.push(thisEventData)
            setEventData(eventData)
            setThisEventData(thisEventData)
            console.log("EVENT DATA")
            console.log(eventData)

            console.log("TICKET BALANCES")
            const thisBalance = await thisEventContract.methods.balanceOf(accounts[0]).call()
            console.log(thisBalance)
          }

          // Get user tickets for each event
          console.log("TICKET BALANCES")
          for (i = 0; i < eventContracts.length; i++) {
            let bal = await eventContracts[i].methods.balanceOf(accounts[0]).call()
            console.log("Event Balance")
            console.log(i)
            console.log(bal['_hex']);
            tickets.push({
              'eventNumber': i, 
              'eventName': eventData[i]['eventName'],
              'numTickets': bal['_hex']
            })
            setThisTicket([i, bal])
          }


        } catch(e) {
          console.log('Error', e)
          window.alert('Contracts not deployed to the current network')
        }
      }
    } else {
      window.alert('Please install MetaMask')
    }

  }


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
          <h1 className="text-center" pb="30px">Created Events</h1>
          <SimpleGrid columns={4} spacing={10}>
            { 
              eventData.map((id, index) => (
                  <Box key={index} border="1px solid black" p="20px" width="20rem">
                    <Text isTruncated fontWeight="bold"> Event {index + 1}</Text>
                    <Text>Name: {id.eventName}</Text>
                    <Text>Symbol: {id.eventSymbol}</Text>
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
                  </Box>
              ))
            }
          </SimpleGrid>
        </div>
      </div>
    );
}

export default App;
