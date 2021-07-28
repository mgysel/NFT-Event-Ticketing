
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
  InputGroup,
  SimpleGrid,
  Box,
  VStack,
  Stack,
  Radio,
  RadioGroup,
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
  var ether_port = 'ws://localhost:8545';
  var oContractsMap = {};
  
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
  const [secondaryTickets, setSecondaryTickets] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [arrQRCode, setArrQRCode] = useState([]);
  
  const [formEventName, setFormEventName] = useState("");
  const [formEventSymbol, setFormEventSymbol] = useState("");
  const [formNumTickets, setFormNumTickets] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formCanBeResold, setFormCanBeResold] = useState(true);
  const [formRoyaltyPercent, setFormRoyaltyPercent] = useState(0);
  
  const [resalePrice, setResalePrice] = useState("");
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
          var web3Subscription = new Web3(new Web3.providers.WebsocketProvider(ether_port));
          // Create event contract from each event address, store in eventContracts
          // Get event data from each event contract, store in eventData
          var allEventContracts = []
          var allEventData = []
          for (var i = 0; i < eventAddresses.length; i++) {
            // Create event contract from event abi, address
            const thisEventContract = new web3.eth.Contract(Event.abi, eventAddresses[i])
            allEventContracts.push(thisEventContract)
            oContractsMap[eventAddresses[i]] = thisEventContract;
      
            var oEventContract = new web3Subscription.eth.Contract(Event.abi, eventAddresses[i])
            // Register Blockchain Events
            // Trap CreateTicket event
            oEventContract.events.CreateTicket().on("connected", function () {
              console.log("listening on event CreateTicket");
              })
              .on("data", (event) => {
                  console.log("event fired: " + JSON.stringify(event.returnValues)); 
                  
                  const requestOptions = {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({contractAddress: event.returnValues.contractAddress,
                          eventName: event.returnValues.eventName,
                          userAddress: event.returnValues.buyer,
                          ticketId: event.returnValues.ticketID.toString()})
                  };
                  fetch(backendServer + "/ticket/add", requestOptions)
                        .then(res => res.json())
                        .then(
                          (result) => {
                              console.log(result);
                              if(result.result === "success") {
                                  getUserTickets();
                              }
                          },
                          // Note: it's important to handle errors here
                          // instead of a catch() block so that we don't swallow
                          // exceptions from actual bugs in components.
                          (error) => {
                            console.error(error);
                          }
                        );
              })
              .on("error", function (error, receipt) {
                  console.log(error);
                  console.log(receipt);
                  console.log("error listening on event CreateTicket");
              });
              
              // TicketUsed Event
            oEventContract.events.TicketUsed().on("connected", function () {
              console.log("listening on event TicketUsed");
              })
              .on("data", (event) => {
                  console.log("event fired: " + JSON.stringify(event.returnValues)); 
                  
                  const requestOptions = {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                                          userAddress: account,
                                          contractAddress: event.returnValues.contractAddress,
                                          ticketId: event.returnValues.ticketID.toString(),
                                          eventName: event.returnValues.eventName, 
                                          qrCode: event.returnValues.sQRCodeKey})
                  };
                  fetch(backendServer + "/usedticket/add", requestOptions)
                        .then(res => res.json())
                        .then(
                          (result) => {
                              console.log(result);
                              getUsedTickets();
                              getUserTickets();
                          },
                          // Note: it's important to handle errors here
                          // instead of a catch() block so that we don't swallow
                          // exceptions from actual bugs in components.
                          (error) => {
                            console.error(error);
                          }
                        );
              })
              .on("error", function (error, receipt) {
                  console.log(error);
                  console.log(receipt);
                  console.log("error listening on event TicketUsed");
              });

              // Ticket Sold event
              oEventContract.events.TicketSold().on("connected", function () {
                console.log("listening on event CreateTicket");
                })
                .on("data", (event) => {
                    console.log("event fired: " + JSON.stringify(event.returnValues)); 
                    
                    const requestOptions = {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({contractAddress: event.returnValues.contractAddress,
                            eventName: event.returnValues.eventName,
                            userAddress: event.returnValues.buyer,
                            ticketId: event.returnValues.ticketID.toString()})
                    };
                    fetch(backendServer + "/ticket/update", requestOptions)
                          .then(res => res.json())
                          .then(
                            (result) => {
                                console.log(result);
                                if(result.result === "success") {
                                    getUserTickets();
                                }
                            },
                            // Note: it's important to handle errors here
                            // instead of a catch() block so that we don't swallow
                            // exceptions from actual bugs in components.
                            (error) => {
                              console.error(error);
                            }
                          );
                })
                .on("error", function (error, receipt) {
                    console.log(error);
                    console.log(receipt);
                    console.log("error listening on event CreateTicket");
                });
      
            // Extract event data from event contract
            const thisEventData = {}
            
            thisEventData['balance'] = await web3.eth.getBalance(eventAddresses[i])
            thisEventData['owner'] = await thisEventContract.methods.owner().call()
            thisEventData['stage'] = await thisEventContract.methods.stage().call()
            thisEventData['eventName'] = await thisEventContract.methods.name().call()
            thisEventData['eventSymbol'] = await thisEventContract.methods.symbol().call()
            thisEventData['numTicketsLeft'] = parseInt(await thisEventContract.methods.numTicketsLeft().call())
            thisEventData['price'] = parseInt(await thisEventContract.methods.price().call())
            thisEventData['canBeResold'] = await thisEventContract.methods.canBeResold().call()
            thisEventData['royaltyPercent'] = parseInt(await thisEventContract.methods.royaltyPercent().call())
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
        getUserTickets();
        getUsedTickets();
      }
  }, [eventData])

  useEffect(() => {
    if(eventData !== null) {
      async function getSecondaryTickets() {
        // Get user tickets for each event
        console.log("Secondary Tickets")
        var secTickets = []
        //console.log(eventData)
        //eventData['secondaryTickets'] = []
        for (var i = 0; i < eventContracts.length; i++) {
          let t = await eventContracts[i].methods.getTicketsCreated().call()
          console.log(t)
          
          for(var j = 0; j < t.length; j++){
            //check if available for sale
            let r = await eventContracts[i].methods.getRegisteredBuyer(j).call()
            console.log(r)
            if(t[j].status == 2){
              let o = await eventContracts[i].methods.ownerOf(j).call()
              console.log(o)
              secTickets.push({
                'eventNumber': i, 
                'eventName': eventData[i]['eventName'],
                'ticketID': j,
                'status': t[j].status,
                'owner': o
              })
            }
          }
        }
        console.log(secTickets)
        setSecondaryTickets(secTickets)
      }

      getSecondaryTickets()
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
  
  async function getUsedTickets() {
      // Get used tickets for each event
      
      if(account) {
          fetch(backendServer + "/usedticket/query?" + new URLSearchParams({
              userAddress: account
          }))
          .then(res => res.json())
          .then(
              (result) => {
                  console.log("Used Tickets Result");
                  console.log(result);
                  setArrQRCode(result);
                  
              },
              // Note: it's important to handle errors here
              // instead of a catch() block so that we don't swallow
              // exceptions from actual bugs in components.
              (error) => {
                console.error(error);
              }
          );
      }
  }
  
  async function getUserTickets() {
      // Get user tickets for each event
      
      if(account) {
          fetch(backendServer + "/ticket/query?" + new URLSearchParams({
              userAddress: account
          }))
          .then(res => res.json())
          .then(
              (result) => {
                  console.log("Tickets Result");
                  console.log(result);
                  setTickets(result);
                  
              },
              // Note: it's important to handle errors here
              // instead of a catch() block so that we don't swallow
              // exceptions from actual bugs in components.
              (error) => {
                console.error(error);
              }
          );
      }
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
          await eventContracts[index].methods.setStage(parseInt(eventStage)).send({ from: account });
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
  


  async function registerToBuy(e, ticketID, eventNumber) {
    try {
      await eventContracts[eventNumber].methods.registerAsBuyer(ticketID).send({ from: account })
      let r = await eventContracts[eventNumber].methods.registeredBuyers().call()
      console.log(r)
    } catch (e) {
      console.log('Register error: ', e)
    }
  }

  async function approveSale(e, ticketID, eventNumber) {
    const buyer = await eventContracts[eventNumber].methods.getRegisteredBuyer(ticketID).call()
    try {
      await eventContracts[eventNumber].methods.approveAsBuyer(buyer, ticketID).send({from: account})
    } catch(e) {
      console.log("Approval error: ", e)
    }
  }

  async function buyTicketFromUser(e, seller, ticketID, eventNumber) {
    const amount = eventData[eventNumber]['price']
    try {
      //await eventContracts[eventNumber].methods.approveAsBuyer(account, ticketID).call({ from: seller })
      await eventContracts[eventNumber].methods.buyTicketFromUser(ticketID).send({ value: amount, from: account})
      //loadEventCreator()
      await getUserTickets()
    } catch(e) {
      console.log('Buy Ticket Error: ', e)
    }
  }
    
  // Allows user to mark ticket as used
  async function setTicketToUsed(e, ticketIndex) {
      try {
          var oTicket = tickets[ticketIndex];
          var oContract = oContractsMap[oTicket.contractAddress];
          if(oContract) {
              await oContract.methods
                  .setTicketToUsed(oTicket.ticketID, sRandomHash).send({ from: account });
          }
      } catch(e) {
        console.log('Set ticket to used: ', e)
      }
  }
  
  // Allows user to mark ticket for sale
  async function setTicketForSale(e, ticketIndex) {
    console.log("enters")
    console.log(ticketIndex)
    console.log(tickets[0])
      try {
          var oTicket = tickets[ticketIndex];
          var oContract = oContractsMap[oTicket.contractAddress];
          if(oContract) {
              await oContract.methods
                  .setTicketForSale(oTicket.ticketID, resalePrice).send({ from: account })
          }
      } catch(e) {
        console.log('Set ticket for sale: ', e)
      }
  }
  
  // Allows user to withdraw from smart contract
  async function withdraw(e, ticketIndex) {
      try {
          var oTicket = tickets[ticketIndex];
          var oContract = oContractsMap[oTicket.contractAddress];
          if(oContract) {
              await oContract.methods
                  .withdraw().send({ from: account })
          }
      } catch(e) {
        console.log('Owner withdraw error: ', e)
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
  
  async function verifyTicketQRCode(e) {
    fetch(backendServer + "/usedticket/query?" + new URLSearchParams({
          eventName: formEventName,
          qrCode: qrCodeValue,
          userAddress: account
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
            Secondary Market Tickets
          </Tab>
          <Tab>
            My Tickets
          </Tab>
          <Tab>
            My Events
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
                  <RadioGroup 
                    mb="10px"
                    _placeholder={{ color: 'gray.500' }}
                    w="450px"
                    h="40px"
                    onChange={setFormCanBeResold} value={formCanBeResold}
                    border="1px"
                    borderRadius="5px"
                    borderColor='gray.200'
                    textAlign=""
                  >
                    <Stack spacing={4} direction="row">
                      <FormLabel 
                        color='gray.500' 
                        verticalAlign='middle'
                        ml="15px"
                        mt="6px"
                      >
                        Can tickets be resold?
                      </FormLabel>
                      <Radio value={true}>Yes</Radio>
                      <Radio value={false}>No</Radio>
                    </Stack>
                  </RadioGroup>
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
                    id.stage !== 0 && id.stage !== 2 && id.stage !== 5 && (
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
                        <Text>Can Be Resold?: {id.canBeResold.toString()}</Text>
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
                    )
                ))
              }
            </SimpleGrid>
          </TabPanel>
          <TabPanel mt="15px" mb="15px" align="center">
            <Heading mb="25px">Secondary Market Tickets</Heading>
            <SimpleGrid columns={4} spacing={10} mt="30px">
              { 
                secondaryTickets.map((id, index) => (
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
                    <Text>Owner: {id.owner}</Text>
                    <Button 
                    type='submit' 
                    color={darkGreen}
                    backgroundColor={lightGreen}
                    size="lg"
                    mt="13px"
                    onClick={(e) => {
                      e.preventDefault()
                      registerToBuy(e, id.ticketID, id.eventNumber)
                    }}
                    >
                        Register To Buy
                    </Button>
                    <Button 
                    type='submit' 
                    color={darkGreen}
                    backgroundColor={lightGreen}
                    size="lg"
                    mt="13px"
                    onClick={(e) => {
                      e.preventDefault()
                      buyTicketFromUser(e, id.owner, id.ticketID, id.eventNumber)
                    }}
                    >
                        Buy Ticket From Owner
                    </Button>
                    <Button 
                    type='submit' 
                    color={darkGreen}
                    backgroundColor={lightGreen}
                    size="lg"
                    mt="13px"
                    onClick={(e) => {
                      e.preventDefault()
                      approveSale(e, id.ticketID, id.eventNumber)
                    }}
                    >
                        Approve Sale
                    </Button>
                  </Box>
                ))
              }
            </SimpleGrid>
          </TabPanel>
          <TabPanel mt="15px" mb="15px" align="center">
              <Heading mb="25px">My Tickets</Heading>
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
                        <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px">Ticket for Event {id.eventName}</Text>
                        <Text>Event: {id.eventName}</Text>
                        <Text>Ticket ID: {id.ticketID}</Text>
                        <Box                       
                          borderRadius="5px"
                          border="1px solid"
                          borderColor="gray.100"
                          padding="10px"
                          mt="10px"
                        >
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
                        </Box>
                        <Box                       
                          borderRadius="5px"
                          border="1px solid"
                          borderColor="gray.100"
                          padding="10px"
                          mt="10px"
                        >
                          <form>
                            <Input
                              isRequired
                              id='resalePrice'
                              type='number'
                              size="md"
                              placeholder='Set Resale Price'
                              onChange={(e) => setResalePrice(e.target.value)}
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
                                setTicketForSale(e, index)
                              }}
                            >
                              Set Ticket For Sale
                            </Button>
                          </form>
                        </Box>
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
                      <Box                       
                        borderRadius="5px"
                        border="1px solid"
                        borderColor="gray.100"
                        padding="10px"
                        mt="10px"
                      >
                        <RadioGroup 
                          mb="10px"
                          onChange={(e) => {
                            id.stage = e;
                            setEventStage(e);
                          }} 
                          value={id.stage.toString() == eventStage ? eventStage : id.stage.toString()}
                          defaultValue={id.stage.toString()}
                        >
                          <Stack spacing={4} direction="column">
                            <Radio value="0" mb="0">Prep</Radio>
                            <Radio value="1">Active</Radio>
                            <Radio value="2">Paused</Radio>
                            <Radio value="3">Checkin Open</Radio>
                            <Radio value="4">Cancelled</Radio>
                            <Radio value="5">Closed</Radio>
                          </Stack>
                        </RadioGroup>
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
                      </Box>
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
            <Heading mb="25px">Oracle</Heading>
              <SimpleGrid columns={4} spacing={10} mt="30px">
                { 
                  arrQRCode.map((id, index) => (
                    <Box key={index}                     
                      borderRadius="5px"
                      border="1px solid"
                      borderColor="gray.200" p="20px" width="20rem"
                    >
                      <Text>Event: {id.eventName}</Text>
                      <Text>Your Personal Entry Key: {id.qrCode}</Text>
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
