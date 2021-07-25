import React, { useState, useEffect } from 'react';
import { ColorModeProvider } from "@chakra-ui/color-mode";
import {
  Heading,
  Flex,
  Center,
  Wrap,
  WrapItem,
  Button,
  Text,
  Form,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  IconButton,
  Icon,
  Input,
  SimpleGrid,
  Box,
  VStack,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from "@chakra-ui/react";
import Web3 from 'web3'
import './App.css';
import Event from '../abis/Event.json';
import EventCreator from '../abis/EventCreator.json'
// This function detects most providers injected at window.ethereum
// import detectEthereumProvider from '@metamask/detect-provider';
var QRCode = require('qrcode.react');


function App() {
  const [web3, setWeb3] = useState("undefined");
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [netId, setNetId] = useState("");
  const [eventCreator, setEventCreator] = useState("");
  const [eventContracts, setEventContracts] = useState([]);
  const [eventAddresses, setEventAddresses] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [arrQRCode, setArrQRCode] = useState([]);

  const [formEventName, setFormEventName] = useState("");
  const [formEventSymbol, setFormEventSymbol] = useState("");
  const [formNumTickets, setFormNumTickets] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formCanBeResold, setFormCanBeResold] = useState(true);
  const [formRoyaltyPercent, setFormRoyaltyPercent] = useState(0);

  const [sRandomHash, setSRandomHash] = useState("");
  const [eventStage, setEventStage] = useState(0);
  const [qrCodeValue, setQrCodeValue] = useState(0);
  const [verificationResult, setVerificationResult] = useState("");

  // Styling
  const lightGreen = "#C6F6DF";
  const darkGreen = "#276749";
  
  const backendServer = "http://127.0.0.1:2122";
  
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
      console.log("account" + accounts);
      if (typeof accounts[0] !== 'undefined') {
        setAccount(accounts[0])
        setBalance(await web3.eth.getBalance(accounts[0]))
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
        var ether_port = 'ws://localhost:8545';
        var web3Subscription = new Web3(new Web3.providers.WebsocketProvider(ether_port));
        // Create event contract from each event address, store in eventContracts
        // Get event data from each event contract, store in eventData
        var allEventContracts = []
        var allEventData = []
        for (var i = 0; i < eventAddresses.length; i++) {
          // Create event contract from event abi, address
          const thisEventContract = new web3.eth.Contract(Event.abi, eventAddresses[i])
          allEventContracts.push(thisEventContract)
          
          var oEventContract = new web3Subscription.eth.Contract(Event.abi, eventAddresses[i])
          oEventContract.events.TicketUsed().on("connected", function () {
            console.log("listening on event temperatureRequest");
            })
            .on("data", (event) => {
                console.log("event fired: " + JSON.stringify(event.returnValues)); 
                
                const requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({eventName: event.returnValues.eventName, 
                        qrCode: event.returnValues.sQRCodeKey})
                };
                fetch(backendServer + "/event/add", requestOptions)
                      .then(res => res.json())
                      .then(
                        (result) => {
                            console.log(result);
                             setArrQRCode([{eventName: event.returnValues.eventName, 
                                RandomHash: event.returnValues.sQRCodeKey}]);
                        },
                        // Note: it's important to handle errors here
                        // instead of a catch() block so that we don't swallow
                        // exceptions from actual bugs in components.
                        (error) => {
                          console.error(error);
                        }
                      );
            })
            .on("error", function (error: any, receipt: any) {
                console.log(error);
                console.log(receipt);
                console.log("error listening on event TicketUsed");
            });

          // Extract event data from event contract
          const thisEventData = {}
          
          thisEventData['balance'] = await web3.eth.getBalance(eventAddresses[i])
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

  async function getUserTickets() {
        // Get user tickets for each event
        console.log("TICKET BALANCES")
        var allTickets = []
        for (var i = 0; i < eventContracts.length; i++) {
          let bal = await eventContracts[i].methods.balanceOf(account).call()
          console.log("Event Balance")
          console.log(i)
          console.log(bal['_hex']);
          let numTickets = parseInt(bal['_hex'])
          if (numTickets > 0) {
            allTickets.push({
              'eventNumber': i, 
              'eventName': eventData[i]['eventName'],
              'numTickets': numTickets
            })
          }
        }
        setTickets(allTickets)
      }
      
  // Allows user to create an event
  async function createEvent(e) {
    // Check that eventCreator
    if (eventCreator !== 'undefined') {
      try {
        console.log(account)
        await eventCreator.methods.createEvent(formNumTickets, formPrice, formCanBeResold, 
            formRoyaltyPercent, formEventName, formEventSymbol).send({ from: account });
      } catch(e) {
        console.log('Create Event error: ', e)
      }
    }
  }

  // Allows user to update stage of event they created
  async function updateEventStage(e, index) {
    // Check that eventCreator
    if (eventContracts[index] !== 'undefined') {
      try {
        await eventContracts[index].methods.setStage(eventStage).send({ from: account });
      } catch(e) {
        console.log('Update event stage error: ', e)
      }
    }
  }

  // Allows user to purchase ticket
  async function buyTicket(e, eventNumber) {
    const amount = eventData[eventNumber]['price']
    try {
      await eventContracts[eventNumber].methods.buyTicket().send({ value: amount, from: account });
      await getUserTickets();
    } catch(e) {
      console.log('Buy Ticket Error: ', e)
    }
  }

  // Allows user to mark ticket as used
  async function setTicketToUsed(e, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.setTicketToUsed(sRandomHash).send({ from: account });
      loadEventCreator();
    } catch(e) {
      console.log('Set ticket to used: ', e)
    }
  }

  // Allows user to mark ticket for sale
  async function setTicketForSale(e, ticketID, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.setTicketForSale(ticketID).send({ from: account })
    } catch(e) {
      console.log('Set ticket for sale: ', e)
    }
  }

  // Allows owner to withdraw from smart contract
  async function ownerWithdraw(e, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.ownerWithdraw().send({ from: account });
    } catch(e) {
      console.log('Owner withdraw error: ', e)
    }
  }

  // Allows user to withdraw from smart contract
  async function withdraw(e, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.withdraw().send({ from: account })
    } catch(e) {
      console.log('Owner withdraw error: ', e)
    }
  }
  
  async function verifyTicketQRCode(e) {
      fetch(backendServer + "/event/query?" + new URLSearchParams({
            eventName: formEventName,
            qrCode: qrCodeValue,
        }))
      .then(res => res.json())
      .then(
        (result) => {
            console.log("Verification Result");
            console.log(result);
            if(result.result){
                setVerificationResult("Passed");
            }
            else {
                setVerificationResult("Failed");
            }
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          console.error(error);
        }
      );
  }

  return (
    <div>
      <Flex w="90%" my="20px" 
        ml="5%"
        mr="5%"
        direction="column"
      >
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <Heading ml={20} color="white">
            TicketChain
          </Heading>
          <VStack spacing={2} alignItems="right">
            <Box className="navbar-brand pb-0 mb-0" justify="right">
              Account: {account}
            </Box>
            <Box className="navbar-brand pt-0 mt-0" justify="right">
              Balance: {balance}
            </Box>
          </VStack>
        </nav>
        <Tabs 
          mt="100px"
          p="20px"
          variant="soft-rounded"
          colorScheme="green"
          borderRadius="5px"
          border="1px solid"
          borderColor="gray.200"
        >
          <TabList>
            <Tab>
              Create Events
            </Tab>
            <Tab>
              Purchase Tickets
            </Tab>
            <Tab>
              My Tickets
            </Tab>
            <Tab>
              My Events
            </Tab>
            <Tab>
              Secondary Tickets
            </Tab>
            <Tab>
              Oracle
            </Tab>
            <Tab>
              Entry Gate
            </Tab>
          </TabList>
          <TabPanels bg="white">
            <TabPanel mt="15px" mb="15px" align="center">
              <Stack width="600px" align="center" justify="center">
                <Heading mb="25px">Create an Event Now</Heading>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      createEvent(e)
                    }}
                  >
                    <Input
                      isRequired
                      id='name'
                      type='text'
                      size="md"
                      placeholder='Event name'
                      onChange={(e) => setFormEventName(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                    <Input
                      isRequired
                      id='symbol'
                      type='text'
                      size="md"
                      placeholder='Token symbol'
                      onChange={(e) => setFormEventSymbol(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                    <Input
                      isRequired
                      id='numTickets'
                      type='number'
                      size="md"
                      placeholder='Number of Tickets'
                      onChange={(e) => setFormNumTickets(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                    <Input
                      isRequired
                      id='price'
                      type='number'
                      size="md"
                      placeholder='Price'
                      onChange={(e) => setFormPrice(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                    <Input
                      isRequired
                      id='canBeResold'
                      type='text'
                      size="md"
                      placeholder='Can the Tickets be resold?'
                      onChange={(e) => setFormCanBeResold(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                    <Input
                      isRequired
                      id='royaltyPercent'
                      type='number'
                      size="md"
                      placeholder='Resale royalty (%)'
                      onChange={(e) => setFormRoyaltyPercent(e.target.value)}
                      mb="10px"
                      _placeholder={{ color: 'gray.500' }}
                      w="450px"
                    />
                  <Button 
                    type='submit' 
                    color={darkGreen}
                    backgroundColor={lightGreen}
                    size="lg"
                    mt="10px"
                  >
                      CREATE EVENT
                  </Button>
                </form>
              </Stack>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
              <Heading mb="25px">Purchase Tickets</Heading>
              <SimpleGrid columns={4} spacing={10} mt="30px">
                { 
                  eventData.map((id, index) => (
                      <Box key={index}        
                        borderRadius="5px"
                        border="1px solid"
                        borderColor="gray.200"
                        p="20px" 
                        width="20rem"
                      >
                        <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px"> Event {index + 1}</Text>
                        <Text>Name: {id.eventName}</Text>
                        <Text>Symbol: {id.eventSymbol}</Text>
                        <Text>Number of Tickets: {id.numTicketsLeft}</Text>
                        <Text>Price: {id.price}</Text>
                        <Text>Can Be Resold?: {id.canBeResold}</Text>
                        <Text>Royalty Percent: {id.royaltyPercent}</Text>
                        <Text>Stage: {id.stage}</Text>
                        <Button 
                          type='submit' 
                          color={darkGreen}
                          backgroundColor={lightGreen}
                          size="lg"
                          mt="13px"
                          onClick={(e) => {
                            e.preventDefault()
                            buyTicket(e, index)
                          }}
                        >
                            Buy Ticket
                        </Button>
                      </Box>
                  ))
                }
              </SimpleGrid>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
              <div div className="content mr-auto ml-auto">
                <h1 className="text-center" pb="30px">My Tickets</h1>
                <SimpleGrid columns={4} spacing={10} mt="30px">
                  { 
                    tickets.map((id, index) => (
                        <Box 
                          key={index} 
                          borderRadius="5px"
                          border="1px solid"
                          borderColor="gray.200"
                          p="20px" 
                          width="20rem"
                        >
                          <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px"> Event {id.eventNumber + 1}</Text>
                          <Text>Event: {id.eventName}</Text>
                          <Text>ID: {id.ticketID}</Text>
                          <form>
                            <Input
                              isRequired
                              id='eventStage'
                              type='number'
                              size="md"
                              placeholder='Set Random Number'
                              onChange={(e) => setSRandomHash(e.target.value)}
                              mb="0px"
                              mt="10px"
                              _placeholder={{ color: 'gray.500' }}
                            />
                            <Button 
                              type='submit' 
                              color={darkGreen}
                              backgroundColor={lightGreen}
                              size="lg"
                              mt="10px"
                              width="210px"
                              onClick={(e) => {
                                e.preventDefault()
                                setTicketToUsed(e, index)
                              }}
                            >
                              Checkin
                            </Button>
                          </form>
                          <Button 
                            type='submit' 
                            color={darkGreen}
                            backgroundColor={lightGreen}
                            size="lg"
                            mt="10px"
                            width="210px"
                            onClick={(e) => {
                              e.preventDefault()
                              setTicketForSale(e, id.ticketID, index)
                            }}
                          >
                            Set Ticket For Sale
                          </Button>
                          <Button 
                            type='submit' 
                            color={darkGreen}
                            backgroundColor={lightGreen}
                            size="lg"
                            mt="10px"
                            width="210px"
                            onClick={(e) => {
                              e.preventDefault()
                              withdraw(e, index)
                            }}
                          >
                            Withdraw Balance
                          </Button>
                        </Box>

                    ))
                  }
                </SimpleGrid>
              </div>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
                <Heading mb="25px">My Events</Heading>
                <SimpleGrid columns={4} spacing={10} mt="30px">
                  { 
                    myEvents.map((id, index) => (
                      <Box 
                        key={index} 
                        borderRadius="5px"
                        border="1px solid"
                        borderColor="gray.200"
                        p="20px" 
                        width="20rem"
                      >
                        <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px"> Event {index + 1}</Text>
                        <Text>Event: {id.eventName}</Text>
                        <Text>Balance: {id.balance}</Text>
                        <Text>Number of Tickets Left: {id.numTicketsLeft}</Text>
                        <form>
                          <Input
                            isRequired
                            id='eventStage'
                            type='number'
                            size="md"
                            placeholder='Set Event Stage'
                            onChange={(e) => setEventStage(e.target.value)}
                            mb="0px"
                            mt="10px"
                            _placeholder={{ color: 'gray.500' }}
                          />
                          <Button 
                            type='submit' 
                            color={darkGreen}
                            backgroundColor={lightGreen}
                            size="lg"
                            mt="10px"
                            width="210px"
                            onClick={(e) => {
                              e.preventDefault()
                              updateEventStage(e, index)
                            }}
                          >
                            Set Event Stage
                          </Button>
                        </form>
                        <Button 
                            type='submit' 
                            color={darkGreen}
                            backgroundColor={lightGreen}
                            size="lg"
                            mt="10px"
                            width="210px"
                            onClick={(e) => {
                              e.preventDefault()
                              ownerWithdraw(e, index)
                            }}
                          >
                            Owner Withdraw
                          </Button>
                      </Box>
                    ))
                  }
                </SimpleGrid>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
              <Heading mb="25px">Secondary Tickets</Heading>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
              <Heading mb="25px">Oracle</Heading>
                <SimpleGrid columns={4} spacing={10} mt="30px">
                  { 
                    arrQRCode.map((id, index) => (
                      <Box key={index} border="1px solid black" p="20px" width="20rem">
                        <Text>Event: {id.eventName}</Text>
                        <Text>Your Personal Entry Key: {id.RandomHash}</Text>
                        <Text>Data sent to Entry Management System Successfully</Text>
                      </Box>
                    ))
                  }
                </SimpleGrid>
            </TabPanel>
            <TabPanel mt="15px" mb="15px" align="center">
             <Stack width="600px" align="center" justify="center">
                <Heading mb="25px">Entry Gate</Heading>
                  <form>
                    <Input
                      isRequired
                      id='nameverify'
                      type='text'
                      size="md"
                      className="form-control form-control-md mb-2"
                      placeholder='Event name'
                      onChange={(e) => setFormEventName(e.target.value)}
                      w="450px"
                    />
                    <Input
                      id='verifyTicketQRCode'
                      type='number'
                      size="md"
                      className="form-control form-control-md mb-2"
                      placeholder='Enter QR Code Value'
                      onChange={(e) => setQrCodeValue(e.target.value)}
                      w="450px"
                    />
                    <Button 
                      type='submit' 
                      color={darkGreen}
                      backgroundColor={lightGreen}
                      size="lg"
                      mt="10px"
                      width="210px"
                      onClick={(e) => {
                        e.preventDefault()
                        verifyTicketQRCode(e)
                      }}
                    >
                      Verify
                    </Button>
                </form>
                <Text>Verification Result: {verificationResult}</Text>
                </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </div>
  );
}

export default App;
