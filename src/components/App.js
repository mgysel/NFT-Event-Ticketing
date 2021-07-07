import React, { Component } from 'react';
import Web3 from 'web3'
import './App.css';
// import Event from '../abis/Event.json';

class App extends Component {
  // Connect app to blockchain with web3
  // componentWillMount always gets called when this component gets attached to DOM
  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  // Load web3
  async loadWeb3() {
    // Modern web browsers
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    // Traditional way
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    // Not ethereum compatible browser
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  // Fetch the SC
  async loadBlockchainData() {
    const web3 = window.web3
    
    // Load metamask accounts
    const accounts = await web3.eth.getAccounts()
    console.log(accounts[0])
    this.setState({ account: accounts[0] })

    const networkId = await web3.eth.net.getId()
    const networkData = Event.networks[networkId]
    // Protect against SC data not being deployed to network
    if(networkData) {
      // Need contract abi and address to connect
      // NOTE: SHOULD STORE THESE IN DB?
      const abi = Event.abi
      const address = networkData.address
      const contract = new web3.eth.Contract(abi, address)
      this.setState({ contract })
      
      //const totalSupply = await contract.methods.totalSupply().call()
      const totalSupply = 6
      this.setState({ totalSupply })
      
      // Load Event Data

    } else {
      window.alert('Smart contract not deployed to detected network.')
    }
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
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
