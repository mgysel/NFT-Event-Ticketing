import React, { Component } from 'react';
import Web3 from 'web3'
import './App.css';
import Event from '../abis/Event.json';
import EventCreator from '../abis/EventCreator.json'
// This function detects most providers injected at window.ethereum
// import detectEthereumProvider from '@metamask/detect-provider';


class App extends Component {
  // Connect app to blockchain with web3
  // componentWillMount always gets called when this component gets attached to DOM
  async componentWillMount() {
    //await this.loadWeb3()
    await this.loadBlockchainData()

    //await this.getEvents()

    if (typeof window.ethereum !== 'undefined') {
      console.log('MetaMask is installed!');
    } else {
      window.alert('Non-Ethereum browser detected. Please install MetaMask!')
    }

    //const accounts = web3.eth.accounts;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  }


  // // Connect to a specific SC
  // async loadBlockchainData() {
  //   const web3 = window.web3
  //   const ethereum = window.ethereum
    
  //   // Load metamask accounts
  //   //const accounts = await web3.eth.getAccounts()
  //   const accounts = await ethereum.request({ method: 'eth_accounts' })
  //   console.log(accounts[0])
  //   this.setState({ account: accounts[0] })

  //   const networkId = await ethereum.request({ method: 'net_version' })
  //   const networkData = Event.networks[networkId]
  //   console.log("NETWORK DATA")
  //   console.log(networkData)

  //   // Protect against SC data not being deployed to network
  //   if(networkData) {
  //     // Need contract abi and address to connect
  //     // NOTE: SHOULD STORE THESE IN DB?
  //     const abi = Event.abi
  //     const address = networkData.address
  //     // const address = '0x0d7f7Ec806f5a24F519eaC6F2783a98738EDeeFD'
  //     const contract = new web3.eth.Contract(abi, address)
  //     this.setState({ contract })
  
  //     // Load Event Data

  //   } else {
  //     window.alert('Smart contract not deployed to detected network.')
  //   }
  // }

  async loadBlockchainData(dispatch) {
    if (typeof window.ethereum !== 'undefined') {
      // Connect to blockchain
      const web3 = new Web3(window.ethereum)

      // User must now allow for connection
      const ethereum = new Web3(window.ethereum)
      await window.ethereum.enable()

      // Get Account, make sure there is a connection
      const accounts = await web3.eth.getAccounts()
      if (typeof accounts[0] !== 'undefined') {
        const netId = await web3.eth.net.getId()
        const balance = await web3.eth.getBalance(accounts[0])
        this.setState({ 
          account: accounts[0],
          web3: web3,
          balance: balance
        })

        // Load Event Creator
        try {
          console.log("EVENT CREATOR ADDRESS")
          console.log(EventCreator.networks[netId].address)
          const eventCreator = new web3.eth.Contract(EventCreator.abi, EventCreator.networks[netId].address)
          this.setState({
            eventCreator: eventCreator
          })
        } catch(e) {
          console.log('Error', e)
          window.alert('Contracts not deployed to the current network')
        }

        // Load Events
        // Store event addresses in eventAddresses
        const eventAddresses = await this.state.eventCreator.methods.getEvents().call()
        console.log("EVENT ADDRESSES")
        console.log(eventAddresses)
        this.setState({
          eventAddresses: eventAddresses
        })

        // Create event contract from each event address, store in eventContracts
        // Get event data from each event contract, store in eventData
        for (var i = 0; i < this.state.eventAddresses.length; i++) {
          console.log(this.state.eventAddresses[i])
          const thisEventContract = new web3.eth.Contract(Event.abi, this.state.eventAddresses[i])
          this.state.eventContracts.push(thisEventContract)

          const thisEventData = {}
          thisEventData['eventName'] = await thisEventContract.methods.name().call()
          thisEventData['eventSymbol'] = await thisEventContract.methods.symbol().call()
          thisEventData['numTicketsLeft'] = await thisEventContract.methods.numTicketsLeft().call()
          thisEventData['price'] = await thisEventContract.methods.price().call()
          thisEventData['canBeResold'] = await thisEventContract.methods.canBeResold().call()
          thisEventData['royaltyPercent'] = await thisEventContract.methods.royaltyPercent().call()
          console.log("THIS EVENT DATA")
          console.log(thisEventData)
          this.state.eventData.push(thisEventData)
          
        }

        // // Create event contracts, store in state
        // var eventAddress
        // for (eventAddress in this.state.events) {
        //   console.log("EVENT ADDRESS")
        //   console.log(eventAddress)
        //   const thisEvent = new web3.eth.Contract(Event.abi, eventAddress)
        //   const thisEventName = await thisEvent.methods.name().call()
        //   console.log("THIS EVENT NAME")
        //   console.log(thisEventName)
        //   this.state.events.push(thisEvent)
        // }
        
        // const thisEventName = await thisEvent.methods.name().call()
        // console.log("THIS EVENT NAME")
        // console.log(thisEventName)
        // console.log("EVENT NAMES")
        // console.log(this.state.events)
        // var ec
        // for (ec in this.state.events) {
        //   console.log(await ec.methods.name().call())
        // }


      }
    } else {
      window.alert('Please install MetaMask')
    }

  }

  async getEvents() {
    // Get Events
    const events = await this.state.eventCreator.methods.getEvents().call()
    console.log(events)

    // Get data for each event
    // const thisEvent = new web3.eth.Contract(Event.abi, events[0])
    // const thisEventName = await thisEvent.methods.getName().call()
    // console.log("THIS EVENT NAME")
    // console.log(thisEventName)

  }


  async createEvent(e, eventName, eventSymbol, numTickets, price, canBeResold, royaltyPercent) {
    // Check that eventCreator
    if (this.state.eventCreator !== 'undefined') {
      try {
        console.log(this.state.account)
        await this.state.eventCreator.methods.createEvent(numTickets, price, canBeResold, royaltyPercent, eventName, eventSymbol).send({ from: this.state.account })
      
      } catch(e) {
        console.log('Create Event error: ', e)
      }
    }
  }



  // async createEvent(e) {
  //   e.preventDefault()
  //   console.log("CREATE EVENT")

  //   // Deploy smart contract
  // }


  constructor(props) {
    super(props)
    this.state = {
      web3: 'undefined',
      account: '',
      eventCreator: null,
      eventCreatorAddress: '',
      eventContracts: [],
      eventAddresses: [],
      eventData: []
    }
  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href=""
            target="_blank"
            rel="noopener noreferrer"
          >
            TicketChain
          </a>
        </nav>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
                <h1>Create an Event Now</h1>
                  <form onSubmit={(e) => {
                      e.preventDefault()
                      let eventName = this.name.value
                      let eventSymbol = this.symbol.value 
                      let numTickets = this.numTickets.value 
                      let price = this.price.value
                      let canBeResold = this.canBeResold.value
                      let royaltyPercent = this.royaltyPercent.value
                      this.createEvent(e, eventName, eventSymbol, numTickets, price, canBeResold, royaltyPercent)
                  }}>
                  <div className='form-group mr-sm-2'>
                  <br></br>
                    <input
                      id='name'
                      type='text'
                      ref={(input) => { this.name = input }}
                      className="form-control form-control-md"
                      placeholder='Event name'
                    />
                    <input
                      id='symbol'
                      type='text'
                      ref={(input) => { this.symbol = input }}
                      className="form-control form-control-md"
                      placeholder='Token symbol'
                    />
                    <input
                      id='numTickets'
                      type='number'
                      ref={(input) => { this.numTickets = input }}
                      className="form-control form-control-md"
                      placeholder='Number of Tickets'
                    />
                    <input
                      id='price'
                      type='number'
                      ref={(input) => { this.price = input }}
                      className="form-control form-control-md"
                      placeholder='Price'
                    />
                    <input
                      id='canBeResold'
                      type='number'
                      ref={(input) => { this.canBeResold = input }}
                      className="form-control form-control-md"
                      placeholder='Can the Tickets be resold?'
                    />
                    <input
                      id='royaltyPercent'
                      type='number'
                      ref={(input) => { this.royaltyPercent = input }}
                      className="form-control form-control-md"
                      placeholder='Resale royalty (%)'
                    />
                  </div>
                  <button type='submit' className='btn btn-primary'>CREATE EVENT</button>
                </form>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
