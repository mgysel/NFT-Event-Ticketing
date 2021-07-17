import React, { Component } from 'react';
import Web3 from 'web3'
import './App.css';
import Event from '../abis/Event.json';
// This function detects most providers injected at window.ethereum
// import detectEthereumProvider from '@metamask/detect-provider';


class App extends Component {
  // Connect app to blockchain with web3
  // componentWillMount always gets called when this component gets attached to DOM
  async componentWillMount() {
    //await this.loadWeb3()
    //await this.loadBlockchainData()

    if (typeof window.ethereum !== 'undefined') {
      console.log('MetaMask is installed!');
    } else {
      window.alert('Non-Ethereum browser detected. Please install MetaMask!')
    }

    //const accounts = web3.eth.accounts;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  }


  // Connect to a specific SC
  async loadBlockchainData() {
    const web3 = window.web3
    const ethereum = window.ethereum
    
    // Load metamask accounts
    //const accounts = await web3.eth.getAccounts()
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    console.log(accounts[0])
    this.setState({ account: accounts[0] })

    const networkId = await ethereum.request({ method: 'net_version' })
    const networkData = Event.networks[networkId]
    console.log(networkData)

    // Protect against SC data not being deployed to network
    if(networkData) {
      // Need contract abi and address to connect
      // NOTE: SHOULD STORE THESE IN DB?
      const abi = Event.abi
      // const address = networkData.address
      const address = '0x0d7f7Ec806f5a24F519eaC6F2783a98738EDeeFD'
      const contract = new web3.eth.Contract(abi, address)
      this.setState({ contract })
  
      // Load Event Data

    } else {
      window.alert('Smart contract not deployed to detected network.')
    }
  }

  async createEvent(e) {
    e.preventDefault()
    console.log("CREATE EVENT")

    // Deploy smart contract
  }


  constructor(props) {
    super(props)
    this.state = {
      account: '',
      contract: null,
      totalSupply: 0,
      colors: []
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
                      // let amount = this.depositAmount.value
                      // amount = amount * 10**18 //convert to wei
                      // this.deposit(amount)
                      this.createEvent(e)
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
                      ref={(input) => { this.name = input }}
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
