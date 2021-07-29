# TicketChain

TicketChain is an NFT event ticketing system that allows event organizers to create events and customers to purchase tickets, all on the Ethereum blockchain.

## Installation and Dependencies
Download the source code from the [master branch](https://github.com/mgysel/comp6452-nft).

This system requires Python 3.7.2, Node.js 14.17, and Ganche CLI v6.12.2 or higher. You can install dependencies and run the component applications. 
This system also requires the application to be run on a web browser with Metamask installed. Metamask must be connected to Ganache on http://localhost:8545.

The backend Flask application can be found in the `backend` directory. Navigate into this directory, then set up and run the application as follows:
```sh
$ python3 -m virtualenv venv
$ source venv/bin/activate
$ pip3 install -r requirements.txt
$ python3 server.py
```

The frontend React application can be found in the `root` directory. Navigate into this directory, then set up and run the application as follows:
```sh
$ npm install
$ npm run start
```
After you run the frontend React application, Metamask will prompt you to connect your accounts. Make sure they are connected to the Ganache Network on http://localhost:8545

The blockchain application can be found in the `root` directory. Navigate into this directory, then run an Ethereum blockchain on Ganche as follows:
```sh
$ ganache-cli -d 100000000 --allowUnlimitedContractSize
```
Next, open a new terminal and deploy the application to Ganache using 
```sh
$ truffle deploy --reset
```

Note that the manual set up commands must be run from the respective directories of the blockchain, backend, and frontend applications.

## Contributors
TicketChain is proudly brought to you by:

* Michael Gysel (z5251938)
* Ashwani Goyal (z5378851)
* Pramith Prashanth (z5198079)
* Yang Yang(z5098181)
