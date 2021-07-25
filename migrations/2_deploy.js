// We import Event from the artifacts (Which contain the ABIs)
const Event = artifacts.require("Event");
const EventCreator = artifacts.require("EventCreator");

/// Purpose of migration scripts are to SC on blockchain
/// These scripts are numbered so we know what order to place them in
module.exports = async function(deployer) {
  // deploy Event
	// We do this using the Truffle deployer
	// NOTE: await causes js to wait until the promise returns a result
  // const numTickets = 5;
  // const price = 50;
  // const canBeResold = true;
  // const royaltyPercent = 20;
  // const eventName = 'EventName'
  // const eventSymbol = 'EventSymbol'
	// await deployer.deploy(Event, numTickets, price, canBeResold, royaltyPercent, eventName, eventSymbol);
  await deployer.deploy(EventCreator);
  
  // const event = await Event.deployed();
  // console.log(event.address);

};




// const Event = artifacts.require("Event");
// const EventCreator = artifacts.require("EventCreator");
// module.exports = function (_deployer) {
//   _deployer.deploy(Event).then(() => _deployer.deploy(EventCreator, Event.address)); 
// };
