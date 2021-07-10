// We import Event from the artifacts (Which contain the ABIs)
const Event = artifacts.require("Event");

/// Purpose of migration scripts are to SC on blockchain
/// These scripts are numbered so we know what order to place them in
module.exports = async function(deployer) {
  // deploy Event
	// We do this using the Truffle deployer
	// NOTE: await causes js to wait until the promise returns a result
  const numTickets = 500;
  const price = 200;
  const canBeResold = true;
  const royaltyPercent = 20;
	await deployer.deploy(Event, numTickets, price, canBeResold, royaltyPercent);
  
  // const event = await Event.deployed();
  // console.log(event.address);

};
